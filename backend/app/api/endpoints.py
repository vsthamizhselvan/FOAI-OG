"""
FastAPI REST API Endpoints for AERON Flight Planner
"""

from typing import Dict, List, Optional, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.models.mission import MissionConfig, VehicleConfig, DynamicEvent, Waypoint
from app.simulation.environment import AirspaceEnvironment
from app.simulation.physics import VehiclePhysics
from app.algorithms.graph import FlightGraphBuilder
from app.reasoning.counterfactuals import CounterfactualEngine
from app.reasoning.dynamic_replanning import DynamicReplanner
from app.reasoning.safety_rules import SafetyRulesEngine
from app.reasoning.explanations import ExplanationEngine
from app.evaluation.benchmarks import BenchmarkSuite

router = APIRouter()


class PlanRequest(BaseModel):
    config: MissionConfig


class ReplanRequest(BaseModel):
    config: MissionConfig
    current_waypoint_id: str
    current_soc_pct: float
    event: DynamicEvent
    original_route: List[str]


class CounterfactualRequest(BaseModel):
    config: MissionConfig


@router.get("/health")
def get_health():
    return {
        "status": "healthy",
        "system": "AERON Counterfactual AI Flight Planner",
        "engine": "AO* AND-OR Search Engine",
        "version": "1.0.0"
    }


@router.get("/environment")
def get_environment():
    env = AirspaceEnvironment()
    return {
        "waypoints": [wp.model_dump() for wp in env.waypoints.values()],
        "corridors": [c.model_dump() for c in env.corridors.values()],
        "restricted_zones": [rz.model_dump() for rz in env.restricted_zones.values()],
        "weather_zones": [wz.model_dump() for wz in env.weather_zones.values()],
        "buildings": [b.model_dump() for b in env.buildings]
    }


@router.get("/missions/demos")
def get_demo_missions():
    """
    Returns the 5 required reproducible demo missions:
    1. Normal Mission (Nominal path to Neo-Pinnacle)
    2. Battery Emergency (Low initial SoC forces divert to industrial vertipad)
    3. Unexpected Obstacle (Primary corridor blocked, forcing bypass)
    4. Weather Deterioration (Severe crosswind & turbulence in coastal corridor)
    5. Destination Unavailable (Destination pad closed, rerouting to certified vertipad)
    """
    demos = [
        {
            "id": "DEMO_1_NORMAL",
            "name": "Demo 1: Nominal Mission",
            "description": "Standard flight scenario finding optimal multi-objective skyway route to Neo-Pinnacle Vertiport.",
            "config": MissionConfig(
                mission_id="DEMO_1",
                name="Nominal Mission",
                start_waypoint_id="WP_START",
                destination_waypoint_id="WP_DESTINATION",
                vehicle_config=VehicleConfig(initial_battery_pct=85.0),
                priority="BALANCED",
                seed=42
            ),
            "event": None,
            "expected_outcome": "Optimal high-speed skyway path selected with >60% remaining battery."
        },
        {
            "id": "DEMO_2_BATTERY_EMERGENCY",
            "name": "Demo 2: Battery Emergency",
            "description": "Vehicle starts with degraded battery (32% SoC). Destination requires ~20%, violating emergency reserve (15%).",
            "config": MissionConfig(
                mission_id="DEMO_2",
                name="Battery Emergency",
                start_waypoint_id="WP_START",
                destination_waypoint_id="WP_DESTINATION",
                vehicle_config=VehicleConfig(initial_battery_pct=32.0, emergency_reserve_pct=15.0),
                priority="LOWEST_ENERGY",
                seed=42
            ),
            "event": DynamicEvent(
                event_type="BATTERY_DROP",
                parameters={"drop_pct": 20.0},
                description="Cell failure drops battery below destination reachability limit."
            ),
            "expected_outcome": "Planner autonomously diverts to certified emergency vertipad to preserve reserve."
        },
        {
            "id": "DEMO_3_OBSTACLE_REROUTE",
            "name": "Demo 3: Unexpected Corridor Obstacle",
            "description": "North Skyway corridor is blocked mid-route by non-cooperative airborne drone swarm.",
            "config": MissionConfig(
                mission_id="DEMO_3",
                name="Corridor Blockage",
                start_waypoint_id="WP_START",
                destination_waypoint_id="WP_DESTINATION",
                vehicle_config=VehicleConfig(initial_battery_pct=80.0),
                priority="SAFEST",
                seed=42
            ),
            "event": DynamicEvent(
                event_type="OBSTACLE_BLOCK",
                target_id="COR_CENTRAL_NORTH",
                description="Airborne obstacle detected in Central-North Skyway corridor."
            ),
            "expected_outcome": "Planner expands alternative branches and reroutes safely via Waterfront Bypass."
        },
        {
            "id": "DEMO_4_WEATHER_STORM",
            "name": "Demo 4: Weather Deterioration",
            "description": "Harbor crosswinds intensify into a severe squall with 2.4x turbulence power penalty.",
            "config": MissionConfig(
                mission_id="DEMO_4",
                name="Weather Deterioration",
                start_waypoint_id="WP_START",
                destination_waypoint_id="WP_DESTINATION",
                vehicle_config=VehicleConfig(initial_battery_pct=78.0),
                priority="SAFEST",
                seed=42
            ),
            "event": DynamicEvent(
                event_type="WEATHER_SPIKE",
                target_id="WZ_COASTAL_GALE",
                parameters={"wind_speed_mps": 32.0, "turbulence_factor": 2.2},
                description="Harbor storm cell intensifies unexpectedly."
            ),
            "expected_outcome": "Planner balances turbulence energy cost versus high-altitude ridge clearance."
        },
        {
            "id": "DEMO_5_DEST_CLOSED",
            "name": "Demo 5: Destination Unavailable",
            "description": "Neo-Pinnacle rooftop vertipad is closed for emergency firefighting ops.",
            "config": MissionConfig(
                mission_id="DEMO_5",
                name="Destination Closed",
                start_waypoint_id="WP_START",
                destination_waypoint_id="WP_DESTINATION",
                vehicle_config=VehicleConfig(initial_battery_pct=82.0),
                priority="BALANCED",
                seed=42
            ),
            "event": DynamicEvent(
                event_type="DESTINATION_CLOSED",
                description="Primary vertipad closed for civilian traffic."
            ),
            "expected_outcome": "Planner identifies closure, prunes invalid goal, and safely terminates at auxiliary vertipad."
        }
    ]
    return demos


@router.post("/plan")
def plan_mission(req: PlanRequest):
    env = AirspaceEnvironment(seed=req.config.seed)
    builder = FlightGraphBuilder(env, req.config)
    search = builder.build_graph()
    result = search.run(req.config.start_waypoint_id)

    # Order waypoints from plan
    waypoint_ids = [nid for nid in result.best_plan_nodes if nid in env.waypoints]
    ordered_wps = []
    curr = req.config.start_waypoint_id
    visited = set()
    while curr and curr not in visited and curr in waypoint_ids:
        visited.add(curr)
        ordered_wps.append(curr)
        node = search.nodes.get(curr)
        if node and node.best_hyperarc:
            next_wp = next((tid for tid in node.best_hyperarc.target_node_ids if tid in env.waypoints), None)
            curr = next_wp
        else:
            break

    if not ordered_wps and waypoint_ids:
        ordered_wps = waypoint_ids

    # Telemetry along route
    v_cfg = req.config.vehicle_config
    route_legs = []
    total_dist = 0.0
    total_time = 0.0
    total_energy = 0.0

    for i in range(len(ordered_wps) - 1):
        w1 = env.waypoints[ordered_wps[i]]
        w2 = env.waypoints[ordered_wps[i + 1]]
        weather = env.get_weather_for_corridor(w1.position, w2.position)
        cor = next((c for c in env.corridors.values() if c.source_id == w1.id and c.target_id == w2.id), None)
        speed = cor.speed_limit_mps if cor else v_cfg.cruise_speed_mps
        telem = VehiclePhysics.calculate_segment_telemetry(w1.position, w2.position, v_cfg, speed, weather)
        total_dist += telem["distance_m"]
        total_time += telem["duration_s"]
        total_energy += telem["energy_consumed_kwh"]
        route_legs.append({
            "from_id": w1.id,
            "to_id": w2.id,
            "from_name": w1.name,
            "to_name": w2.name,
            "from_pos": w1.position.model_dump(),
            "to_pos": w2.position.model_dump(),
            "telemetry": telem,
            "corridor_id": cor.id if cor else None
        })

    consumed_pct = (total_energy / v_cfg.battery_capacity_kwh) * 100.0
    remaining_soc = v_cfg.initial_battery_pct - consumed_pct

    terminal_id = ordered_wps[-1] if ordered_wps else None
    terminal_wp = env.waypoints.get(terminal_id) if terminal_id else None

    # Collect infeasible nodes for XAI
    infeasible_nodes = [
        n.to_dict() for n in search.nodes.values()
        if n.infeasible or n.node_type == "FAIL"
    ]

    # Generate XAI explanation
    explanation_data = ExplanationEngine.generate_plan_explanation(
        result=result,
        waypoint_names=[env.waypoints[w].name for w in ordered_wps],
        total_energy_kwh=total_energy,
        final_soc_pct=remaining_soc,
        reserve_limit_pct=v_cfg.emergency_reserve_pct,
        priority=req.config.priority,
        infeasible_nodes=infeasible_nodes
    )

    # Corridors used for safety audit
    corridors_used = []
    for i in range(len(ordered_wps) - 1):
        c = next((cor for cor in env.corridors.values() if cor.source_id == ordered_wps[i] and cor.target_id == ordered_wps[i+1]), None)
        if c:
            corridors_used.append(c)

    audit = SafetyRulesEngine.audit_route(
        waypoints=[env.waypoints[w] for w in ordered_wps],
        corridors=corridors_used,
        restricted_zones=list(env.restricted_zones.values()),
        initial_soc_pct=v_cfg.initial_battery_pct,
        reserve_limit_pct=v_cfg.emergency_reserve_pct,
        total_energy_kwh=total_energy,
        battery_capacity_kwh=v_cfg.battery_capacity_kwh
    )

    return {
        "success": result.success and audit.is_safe,
        "solution_cost": round(result.solution_cost, 2) if result.success else -1,
        "route_waypoints": ordered_wps,
        "route_waypoint_names": [env.waypoints[w].name for w in ordered_wps],
        "terminal_landing_site": terminal_wp.name if terminal_wp else "None",
        "is_emergency_landing": terminal_wp.is_emergency_pad if terminal_wp else False,
        "total_distance_m": round(total_dist, 1),
        "total_time_s": round(total_time, 1),
        "total_energy_kwh": round(total_energy, 2),
        "initial_soc_pct": v_cfg.initial_battery_pct,
        "remaining_soc_pct": round(remaining_soc, 1),
        "emergency_reserve_pct": v_cfg.emergency_reserve_pct,
        "route_legs": route_legs,
        "graph": result.graph_nodes,
        "trace": [t.to_dict() for t in result.trace],
        "explanation": explanation_data,
        "safety_audit": audit.to_dict()
    }


@router.post("/counterfactuals")
def evaluate_counterfactuals(req: CounterfactualRequest):
    env = AirspaceEnvironment(seed=req.config.seed)
    return CounterfactualEngine.run_counterfactual_suite(env, req.config)


@router.post("/replan")
def replan_mission(req: ReplanRequest):
    env = AirspaceEnvironment(seed=req.config.seed)
    return DynamicReplanner.execute_in_flight_replan(
        env=env,
        config=req.config,
        current_waypoint_id=req.current_waypoint_id,
        current_soc_pct=req.current_soc_pct,
        event=req.event,
        original_route=req.original_route
    )


@router.post("/evaluate")
def run_evaluation():
    return BenchmarkSuite.run_all_benchmarks()
