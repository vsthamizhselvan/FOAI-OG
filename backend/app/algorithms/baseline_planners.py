"""
Baseline Search Algorithms (A* and Greedy Best-First Search)
for Comparative Benchmarking against AO* on Compatible Graph Projections.
"""

import heapq
import time
from typing import Dict, List, Optional, Tuple, Any
from app.models.mission import MissionConfig
from app.simulation.environment import AirspaceEnvironment
from app.simulation.physics import VehiclePhysics
from app.algorithms.heuristics import FlightHeuristics


class BaselinePlannerResult:
    def __init__(self, algorithm: str, success: bool, path: List[str], cost: float,
                 expanded_nodes: int, generated_nodes: int, runtime_ms: float, explanation: str):
        self.algorithm = algorithm
        self.success = success
        self.path = path
        self.cost = cost
        self.expanded_nodes = expanded_nodes
        self.generated_nodes = generated_nodes
        self.runtime_ms = runtime_ms
        self.explanation = explanation

    def to_dict(self) -> Dict[str, Any]:
        return {
            "algorithm": self.algorithm,
            "success": self.success,
            "path": self.path,
            "cost": round(self.cost, 2) if self.cost < 1e8 else -1,
            "expanded_nodes": self.expanded_nodes,
            "generated_nodes": self.generated_nodes,
            "runtime_ms": round(self.runtime_ms, 3),
            "explanation": self.explanation
        }


class BaselinePlanners:
    @staticmethod
    def run_astar(env: AirspaceEnvironment, config: MissionConfig, initial_soc_pct: Optional[float] = None) -> BaselinePlannerResult:
        """
        Standard A* Search on the single-agent state projection graph.
        """
        start_time = time.perf_counter()
        v_cfg = config.vehicle_config
        current_soc = initial_soc_pct if initial_soc_pct is not None else v_cfg.initial_battery_pct
        reserve_pct = v_cfg.emergency_reserve_pct
        start_id = config.start_waypoint_id
        dest_id = config.destination_waypoint_id

        # Priority queue: (f_score, g_score, current_waypoint_id, path, current_soc)
        start_wp = env.waypoints[start_id]
        dest_wp = env.waypoints[dest_id]
        initial_h = FlightHeuristics.estimate_heuristic(start_wp.position, dest_wp.position, v_cfg, config.priority)

        pq = [(initial_h, 0.0, start_id, [start_id], current_soc)]
        visited_costs: Dict[str, float] = {start_id: 0.0}
        expanded_nodes = 0
        generated_nodes = 1

        while pq:
            f, g, u_id, path, soc = heapq.heappop(pq)
            expanded_nodes += 1

            if u_id == dest_id:
                runtime_ms = (time.perf_counter() - start_time) * 1000.0
                return BaselinePlannerResult(
                    algorithm="A* Baseline",
                    success=True,
                    path=path,
                    cost=g,
                    expanded_nodes=expanded_nodes,
                    generated_nodes=generated_nodes,
                    runtime_ms=runtime_ms,
                    explanation=f"A* reached destination with optimal single-path cost {g:.2f} across {len(path)} waypoints."
                )

            # Check emergency pad if dest not directly reachable
            u_wp = env.waypoints[u_id]
            if u_wp.is_emergency_pad and len(path) > 1:
                # Can land here as fallback
                pass

            # Explore outgoing corridors
            for cor in env.corridors.values():
                if cor.source_id == u_id:
                    v_id = cor.target_id
                    v_wp = env.waypoints[v_id]

                    # Obstacle check
                    if cor.is_blocked:
                        continue

                    # Restricted airspace check
                    intersected = any(
                        env.check_restricted_intersection(u_wp.position, v_wp.position, rz)
                        for rz in env.restricted_zones.values()
                    )
                    if intersected:
                        continue

                    # Target pad availability check
                    if not v_wp.pad_available:
                        continue

                    # Physics telemetry & battery reserve check
                    weather = env.get_weather_for_corridor(u_wp.position, v_wp.position)
                    telemetry = VehiclePhysics.calculate_segment_telemetry(
                        u_wp.position, v_wp.position, v_cfg, cor.speed_limit_mps, weather
                    )
                    next_soc = soc - telemetry["battery_pct_cost"]
                    if next_soc < reserve_pct:
                        continue  # Reserve breach

                    edge_cost = FlightHeuristics.compute_edge_cost(
                        telemetry, cor.risk_level, config.priority, config.risk_tolerance
                    )
                    tentative_g = g + edge_cost

                    if v_id not in visited_costs or tentative_g < visited_costs[v_id]:
                        visited_costs[v_id] = tentative_g
                        h = FlightHeuristics.estimate_heuristic(v_wp.position, dest_wp.position, v_cfg, config.priority)
                        generated_nodes += 1
                        heapq.heappush(pq, (tentative_g + h, tentative_g, v_id, path + [v_id], next_soc))

        runtime_ms = (time.perf_counter() - start_time) * 1000.0
        return BaselinePlannerResult(
            algorithm="A* Baseline",
            success=False,
            path=[],
            cost=float("inf"),
            expanded_nodes=expanded_nodes,
            generated_nodes=generated_nodes,
            runtime_ms=runtime_ms,
            explanation="A* failed to find a feasible path respecting all safety and energy constraints."
        )

    @staticmethod
    def run_greedy(env: AirspaceEnvironment, config: MissionConfig, initial_soc_pct: Optional[float] = None) -> BaselinePlannerResult:
        """
        Greedy Best-First Search baseline (expands solely on heuristic h(n)).
        """
        start_time = time.perf_counter()
        v_cfg = config.vehicle_config
        current_soc = initial_soc_pct if initial_soc_pct is not None else v_cfg.initial_battery_pct
        reserve_pct = v_cfg.emergency_reserve_pct
        start_id = config.start_waypoint_id
        dest_id = config.destination_waypoint_id

        start_wp = env.waypoints[start_id]
        dest_wp = env.waypoints[dest_id]
        initial_h = FlightHeuristics.estimate_heuristic(start_wp.position, dest_wp.position, v_cfg, config.priority)

        # Priority queue ordered ONLY by heuristic h
        pq = [(initial_h, 0.0, start_id, [start_id], current_soc)]
        visited = set()
        expanded_nodes = 0
        generated_nodes = 1

        while pq:
            h, g, u_id, path, soc = heapq.heappop(pq)
            if u_id in visited:
                continue
            visited.add(u_id)
            expanded_nodes += 1

            if u_id == dest_id:
                runtime_ms = (time.perf_counter() - start_time) * 1000.0
                return BaselinePlannerResult(
                    algorithm="Greedy Best-First",
                    success=True,
                    path=path,
                    cost=g,
                    expanded_nodes=expanded_nodes,
                    generated_nodes=generated_nodes,
                    runtime_ms=runtime_ms,
                    explanation=f"Greedy planner found route to destination with cost {g:.2f}."
                )

            u_wp = env.waypoints[u_id]
            for cor in env.corridors.values():
                if cor.source_id == u_id and cor.target_id not in visited:
                    v_id = cor.target_id
                    v_wp = env.waypoints[v_id]

                    if cor.is_blocked:
                        continue

                    intersected = any(
                        env.check_restricted_intersection(u_wp.position, v_wp.position, rz)
                        for rz in env.restricted_zones.values()
                    )
                    if intersected:
                        continue

                    if not v_wp.pad_available:
                        continue

                    weather = env.get_weather_for_corridor(u_wp.position, v_wp.position)
                    telemetry = VehiclePhysics.calculate_segment_telemetry(
                        u_wp.position, v_wp.position, v_cfg, cor.speed_limit_mps, weather
                    )
                    next_soc = soc - telemetry["battery_pct_cost"]
                    if next_soc < reserve_pct:
                        continue

                    edge_cost = FlightHeuristics.compute_edge_cost(
                        telemetry, cor.risk_level, config.priority, config.risk_tolerance
                    )
                    h_val = FlightHeuristics.estimate_heuristic(v_wp.position, dest_wp.position, v_cfg, config.priority)
                    generated_nodes += 1
                    heapq.heappush(pq, (h_val, g + edge_cost, v_id, path + [v_id], next_soc))

        runtime_ms = (time.perf_counter() - start_time) * 1000.0
        return BaselinePlannerResult(
            algorithm="Greedy Best-First",
            success=False,
            path=[],
            cost=float("inf"),
            expanded_nodes=expanded_nodes,
            generated_nodes=generated_nodes,
            runtime_ms=runtime_ms,
            explanation="Greedy Best-First failed to find a valid route."
        )
