"""
AND-OR Flight Problem Graph Generator
Translates physical flight domain into formal AND-OR graph for AO* search.
"""

from typing import Dict, List, Optional, Tuple, Any
from app.algorithms.ao_star import AOStarSearch, AONode, HyperArc, INFINITY
from app.algorithms.heuristics import FlightHeuristics
from app.simulation.physics import VehiclePhysics
from app.simulation.environment import AirspaceEnvironment
from app.models.mission import MissionConfig, Waypoint, FlightCorridor


class FlightGraphBuilder:
    def __init__(self, env: AirspaceEnvironment, config: MissionConfig):
        self.env = env
        self.config = config
        self.dest_wp = env.waypoints[config.destination_waypoint_id]

    def build_graph(self, initial_soc_pct: Optional[float] = None) -> AOStarSearch:
        search = AOStarSearch()
        v_cfg = self.config.vehicle_config
        current_soc = initial_soc_pct if initial_soc_pct is not None else v_cfg.initial_battery_pct
        reserve_pct = v_cfg.emergency_reserve_pct

        # 1. Create Waypoint OR Nodes
        for wid, wp in self.env.waypoints.items():
            if wid == self.config.destination_waypoint_id:
                if wp.pad_available:
                    node = AONode(
                        node_id=wid,
                        name=f"{wp.name} [GOAL]",
                        node_type="GOAL",
                        heuristic=0.0,
                        state_data={"waypoint": wp.model_dump(), "is_destination": True}
                    )
                else:
                    node = AONode(
                        node_id=wid,
                        name=f"{wp.name} [PAD CLOSED]",
                        node_type="FAIL",
                        heuristic=INFINITY,
                        state_data={"waypoint": wp.model_dump(), "pad_unavailable": True}
                    )
            elif wp.is_emergency_pad:
                # Emergency pad: acts as contingency goal with higher base cost penalty
                if wp.pad_available:
                    node = AONode(
                        node_id=wid,
                        name=f"{wp.name} [EMERGENCY PAD]",
                        node_type="GOAL",
                        heuristic=100.0,  # Strict contingency penalty vs true destination
                        state_data={"waypoint": wp.model_dump(), "is_emergency": True}
                    )
                else:
                    node = AONode(
                        node_id=wid,
                        name=f"{wp.name} [PAD OFFLINE]",
                        node_type="FAIL",
                        heuristic=INFINITY,
                        state_data={"waypoint": wp.model_dump(), "pad_unavailable": True}
                    )
            else:
                # Standard waypoint OR node
                h = FlightHeuristics.estimate_heuristic(
                    wp.position, self.dest_wp.position, v_cfg, self.config.priority
                )
                node = AONode(
                    node_id=wid,
                    name=wp.name,
                    node_type="OR",
                    heuristic=h,
                    state_data={"waypoint": wp.model_dump()}
                )
            search.add_node(node)

        # 2. Add Corridors as HyperArcs with AND conjuncts
        # For each corridor A -> B, create:
        # - Target node B
        # - Safety Clearance Check Node: CHECK_{A}_{B}
        for cid, cor in self.env.corridors.items():
            src_wp = self.env.waypoints[cor.source_id]
            tgt_wp = self.env.waypoints[cor.target_id]

            # Physical telemetry along corridor
            weather = self.env.get_weather_for_corridor(src_wp.position, tgt_wp.position)
            telemetry = VehiclePhysics.calculate_segment_telemetry(
                src_wp.position, tgt_wp.position, v_cfg, cor.speed_limit_mps, weather
            )

            # Check Safety and Hard Constraints
            is_blocked = cor.is_blocked
            restricted_violation = False
            violated_zone_name = ""
            for rz in self.env.restricted_zones.values():
                if self.env.check_restricted_intersection(src_wp.position, tgt_wp.position, rz):
                    restricted_violation = True
                    violated_zone_name = rz.name
                    break

            battery_cost_pct = telemetry["battery_pct_cost"]
            # Energy reserve violation check
            reserve_violation = (current_soc - battery_cost_pct) < reserve_pct

            # Create the Conjunct Node: CHECK_{src}_{tgt}
            check_node_id = f"CHECK_{cor.source_id}_{cor.target_id}"

            if is_blocked:
                chk_node = AONode(
                    node_id=check_node_id,
                    name=f"Check {src_wp.name}->{tgt_wp.name} [BLOCKED]",
                    node_type="FAIL",
                    heuristic=INFINITY,
                    state_data={"reason": "Corridor blocked by airborne obstacle/debris"}
                )
            elif restricted_violation:
                chk_node = AONode(
                    node_id=check_node_id,
                    name=f"Check {src_wp.name}->{tgt_wp.name} [RESTRICTED AIRSPACE]",
                    node_type="FAIL",
                    heuristic=INFINITY,
                    state_data={"reason": f"Corridor penetrates prohibited airspace: {violated_zone_name}"}
                )
            elif reserve_violation:
                chk_node = AONode(
                    node_id=check_node_id,
                    name=f"Check {src_wp.name}->{tgt_wp.name} [RESERVE BREACH]",
                    node_type="FAIL",
                    heuristic=INFINITY,
                    state_data={
                        "reason": f"Remaining SoC ({current_soc - battery_cost_pct:.1f}%) breaches safety reserve ({reserve_pct:.1f}%)"
                    }
                )
            else:
                # Safe clearance verified! Conjunct is solved with minor clearance verification cost
                clearance_cost = cor.risk_level * 2.0
                chk_node = AONode(
                    node_id=check_node_id,
                    name=f"Clearance {src_wp.name}->{tgt_wp.name} [CLEARED]",
                    node_type="GOAL",
                    heuristic=clearance_cost,
                    state_data={"cleared": True, "telemetry": telemetry}
                )

            search.add_node(chk_node)

            # Compute Hyperarc Edge Cost
            edge_cost = FlightHeuristics.compute_edge_cost(
                telemetry, cor.risk_level, self.config.priority, self.config.risk_tolerance
            )

            # Hyperarc points to AND conjuncts: [target_waypoint, check_node]
            search.add_hyperarc(
                source_id=cor.source_id,
                action_id=cor.id,
                action_name=f"Fly via {cor.id} to {tgt_wp.name}",
                cost=edge_cost,
                target_ids=[cor.target_id, check_node_id],
                metadata={
                    "corridor": cor.model_dump(),
                    "telemetry": telemetry,
                    "check_node_id": check_node_id
                }
            )

        return search
