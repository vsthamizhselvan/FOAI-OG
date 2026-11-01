"""
Dynamic In-Flight Replanning Engine
Handles real-time disturbance injection and triggers AO* replanning from current waypoint.
"""

from typing import Dict, List, Optional, Any
import copy
from app.models.mission import MissionConfig, DynamicEvent
from app.simulation.environment import AirspaceEnvironment
from app.simulation.physics import VehiclePhysics
from app.algorithms.graph import FlightGraphBuilder
from app.algorithms.ao_star import AOStarResult


class DynamicReplanner:
    @staticmethod
    def execute_in_flight_replan(
        env: AirspaceEnvironment,
        config: MissionConfig,
        current_waypoint_id: str,
        current_soc_pct: float,
        event: DynamicEvent,
        original_route: List[str]
    ) -> Dict[str, Any]:
        """
        Applies disturbance to simulation state and computes real-time replanned trajectory from current position.
        """
        updated_env = copy.deepcopy(env)
        updated_config = copy.deepcopy(config)
        replan_reason = ""

        # 1. Apply Dynamic Disturbance
        if event.event_type == "OBSTACLE_BLOCK":
            corridor_id = event.target_id or "COR_CENTRAL_NORTH"
            if corridor_id in updated_env.corridors:
                updated_env.corridors[corridor_id].is_blocked = True
                replan_reason = f"Corridor {corridor_id} abruptly obstructed by airborne obstacle. Recalculating route..."
            else:
                replan_reason = f"Unidentified corridor obstacle: {corridor_id}"

        elif event.event_type == "BATTERY_DROP":
            drop_amount = float(event.parameters.get("drop_pct", 25.0))
            current_soc_pct = max(5.0, current_soc_pct - drop_amount)
            replan_reason = f"Sudden cell degradation: battery dropped by {drop_amount:.1f}% to {current_soc_pct:.1f}% SoC."

        elif event.event_type == "WEATHER_SPIKE":
            zone_id = event.target_id or "WZ_COASTAL_GALE"
            if zone_id in updated_env.weather_zones:
                wz = updated_env.weather_zones[zone_id]
                wz.wind_speed_mps = float(event.parameters.get("wind_speed_mps", 30.0))
                wz.turbulence_factor = float(event.parameters.get("turbulence_factor", 2.2))
                replan_reason = f"Severe microburst detected in {wz.name} (wind {wz.wind_speed_mps:.1f} m/s, turb {wz.turbulence_factor}x)."
            else:
                replan_reason = "Atmospheric turbulence spike detected."

        elif event.event_type == "DESTINATION_CLOSED":
            dest_id = config.destination_waypoint_id
            if dest_id in updated_env.waypoints:
                updated_env.waypoints[dest_id].pad_available = False
                replan_reason = f"Primary destination vertipad '{updated_env.waypoints[dest_id].name}' closed for emergency operations."

        elif event.event_type == "RESTRICTED_AIRSPACE_ACTIVE":
            zone_id = event.target_id or "RZ_GOV_CORE"
            if zone_id in updated_env.restricted_zones:
                updated_env.restricted_zones[zone_id].active = True
                replan_reason = f"Security alert: prohibited airspace {updated_env.restricted_zones[zone_id].name} activated immediately."

        else:
            replan_reason = f"General disturbance injected: {event.description}"

        # 2. Configure replan starting from current_waypoint_id
        updated_config.start_waypoint_id = current_waypoint_id
        builder = FlightGraphBuilder(updated_env, updated_config)
        search = builder.build_graph(initial_soc_pct=current_soc_pct)
        result = search.run(current_waypoint_id)

        # 3. Extract remaining route
        new_remaining_wps = []
        curr = current_waypoint_id
        visited = set()
        while curr and curr not in visited and curr in result.best_plan_nodes:
            visited.add(curr)
            new_remaining_wps.append(curr)
            node = search.nodes.get(curr)
            if node and node.best_hyperarc:
                next_wp = next((tid for tid in node.best_hyperarc.target_node_ids if tid in updated_env.waypoints), None)
                curr = next_wp
            else:
                break

        # Spliced full route: waypoints traversed up to current + newly planned remaining
        if current_waypoint_id in original_route:
            idx = original_route.index(current_waypoint_id)
            traversed_so_far = original_route[:idx]
            spliced_full_route = traversed_so_far + new_remaining_wps
        else:
            spliced_full_route = new_remaining_wps

        # Compute telemetry for remaining legs
        v_cfg = updated_config.vehicle_config
        rem_energy = 0.0
        rem_time = 0.0
        for i in range(len(new_remaining_wps) - 1):
            w1 = updated_env.waypoints[new_remaining_wps[i]]
            w2 = updated_env.waypoints[new_remaining_wps[i + 1]]
            weather = updated_env.get_weather_for_corridor(w1.position, w2.position)
            telem = VehiclePhysics.calculate_segment_telemetry(w1.position, w2.position, v_cfg, v_cfg.cruise_speed_mps, weather)
            rem_energy += telem["energy_consumed_kwh"]
            rem_time += telem["duration_s"]

        final_soc = current_soc_pct - ((rem_energy / v_cfg.battery_capacity_kwh) * 100.0)

        terminal_wp = updated_env.waypoints.get(new_remaining_wps[-1]) if new_remaining_wps else None
        is_emergency = terminal_wp.is_emergency_pad if terminal_wp else False

        return {
            "success": result.success,
            "replan_reason": replan_reason,
            "current_waypoint_id": current_waypoint_id,
            "current_soc_pct": round(current_soc_pct, 1),
            "original_route": original_route,
            "spliced_full_route": spliced_full_route,
            "remaining_route": new_remaining_wps,
            "terminal_landing_site": terminal_wp.name if terminal_wp else "None",
            "is_emergency_landing": is_emergency,
            "remaining_energy_kwh": round(rem_energy, 2),
            "remaining_time_s": round(rem_time, 1),
            "final_projected_soc_pct": round(final_soc, 1),
            "solution_cost": round(result.solution_cost, 2) if result.success else -1,
            "expanded_nodes": result.expanded_count,
            "trace": [t.to_dict() for t in result.trace]
        }
