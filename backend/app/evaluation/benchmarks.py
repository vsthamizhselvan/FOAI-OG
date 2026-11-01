"""
Benchmark Evaluation Suite for AERON
Runs AO*, A*, and Greedy Best-First Search on 5 reproducible seeded benchmark missions:
1. Normal Nominal Mission (Easy)
2. High-Speed Skyline Transit (Medium)
3. Constrained Weather & High Winds (Medium)
4. Dense Obstacle & Restricted Airspace (Hard)
5. Critical Battery & Reserve Pressure (Extreme)
"""

import time
from typing import Dict, List, Any
import copy
from app.models.mission import MissionConfig, VehicleConfig
from app.simulation.environment import AirspaceEnvironment
from app.algorithms.graph import FlightGraphBuilder
from app.algorithms.baseline_planners import BaselinePlanners


class BenchmarkSuite:
    @staticmethod
    def get_benchmark_configs() -> List[Dict[str, Any]]:
        return [
            {
                "id": "BENCH_1_NOMINAL",
                "name": "Benchmark 1: Nominal Urban Transit (Easy)",
                "description": "Standard conditions, clear weather, ample battery (85%).",
                "config": MissionConfig(
                    mission_id="BENCH_1",
                    name="Nominal Urban Transit",
                    start_waypoint_id="WP_START",
                    destination_waypoint_id="WP_DESTINATION",
                    vehicle_config=VehicleConfig(initial_battery_pct=85.0),
                    priority="BALANCED",
                    seed=101
                ),
                "env_modifiers": {}
            },
            {
                "id": "BENCH_2_SPEED_PRIORITY",
                "name": "Benchmark 2: High-Speed Transit (Medium)",
                "description": "Speed priority with tight travel time requirements.",
                "config": MissionConfig(
                    mission_id="BENCH_2",
                    name="High-Speed Transit",
                    start_waypoint_id="WP_START",
                    destination_waypoint_id="WP_DESTINATION",
                    vehicle_config=VehicleConfig(initial_battery_pct=75.0, max_speed_mps=65.0),
                    priority="SHORTEST_TIME",
                    seed=202
                ),
                "env_modifiers": {}
            },
            {
                "id": "BENCH_3_WEATHER_GALE",
                "name": "Benchmark 3: Severe Weather & High Wind (Medium)",
                "description": "Crosswinds and turbulence zones active in coastal corridors.",
                "config": MissionConfig(
                    mission_id="BENCH_3",
                    name="Severe Weather & Wind",
                    start_waypoint_id="WP_START",
                    destination_waypoint_id="WP_DESTINATION",
                    vehicle_config=VehicleConfig(initial_battery_pct=70.0),
                    priority="SAFEST",
                    seed=303
                ),
                "env_modifiers": {"wz_intense": True}
            },
            {
                "id": "BENCH_4_RESTRICTED_AIRSPACE",
                "name": "Benchmark 4: Dense Airspace Constraints (Hard)",
                "description": "Prohibited sanctuary airspace active, forcing major corridor bypass.",
                "config": MissionConfig(
                    mission_id="BENCH_4",
                    name="Dense Airspace Constraints",
                    start_waypoint_id="WP_START",
                    destination_waypoint_id="WP_DESTINATION",
                    vehicle_config=VehicleConfig(initial_battery_pct=65.0),
                    priority="SAFEST",
                    seed=404
                ),
                "env_modifiers": {"rz_active": True, "cor_blocked": True}
            },
            {
                "id": "BENCH_5_LOW_BATTERY_RESERVE",
                "name": "Benchmark 5: Critical Battery & Reserve Pressure (Extreme)",
                "description": "Marginal battery (42%) with strict 15% reserve limit.",
                "config": MissionConfig(
                    mission_id="BENCH_5",
                    name="Critical Battery Reserve",
                    start_waypoint_id="WP_START",
                    destination_waypoint_id="WP_DESTINATION",
                    vehicle_config=VehicleConfig(initial_battery_pct=42.0, emergency_reserve_pct=15.0),
                    priority="LOWEST_ENERGY",
                    seed=505
                ),
                "env_modifiers": {}
            }
        ]

    @staticmethod
    def run_all_benchmarks() -> Dict[str, Any]:
        """
        Executes AO*, A*, and Greedy across all 5 benchmark configurations.
        """
        benchmarks = BenchmarkSuite.get_benchmark_configs()
        results_matrix = []

        ao_totals = {"runtime_ms": 0.0, "expansions": 0, "solved": 0}
        astar_totals = {"runtime_ms": 0.0, "expansions": 0, "solved": 0}
        greedy_totals = {"runtime_ms": 0.0, "expansions": 0, "solved": 0}

        for bench in benchmarks:
            cfg: MissionConfig = bench["config"]
            env = AirspaceEnvironment(seed=cfg.seed)

            # Apply modifiers
            if bench["env_modifiers"].get("rz_active"):
                env.restricted_zones["RZ_GOV_CORE"].active = True
            if bench["env_modifiers"].get("cor_blocked"):
                env.corridors["COR_CENTRAL_NORTH"].is_blocked = True
            if bench["env_modifiers"].get("wz_intense"):
                env.weather_zones["WZ_COASTAL_GALE"].wind_speed_mps = 28.0
                env.weather_zones["WZ_COASTAL_GALE"].turbulence_factor = 2.0

            # 1. Run AO*
            ao_start = time.perf_counter()
            builder = FlightGraphBuilder(env, cfg)
            search = builder.build_graph(initial_soc_pct=cfg.vehicle_config.initial_battery_pct)
            ao_res = search.run(cfg.start_waypoint_id)
            ao_time_ms = (time.perf_counter() - ao_start) * 1000.0

            ao_totals["runtime_ms"] += ao_time_ms
            ao_totals["expansions"] += ao_res.expanded_count
            if ao_res.success:
                ao_totals["solved"] += 1

            # 2. Run A* Baseline
            astar_res = BaselinePlanners.run_astar(env, cfg, initial_soc_pct=cfg.vehicle_config.initial_battery_pct)
            astar_totals["runtime_ms"] += astar_res.runtime_ms
            astar_totals["expansions"] += astar_res.expanded_nodes
            if astar_res.success:
                astar_totals["solved"] += 1

            # 3. Run Greedy Baseline
            greedy_res = BaselinePlanners.run_greedy(env, cfg, initial_soc_pct=cfg.vehicle_config.initial_battery_pct)
            greedy_totals["runtime_ms"] += greedy_res.runtime_ms
            greedy_totals["expansions"] += greedy_res.expanded_nodes
            if greedy_res.success:
                greedy_totals["solved"] += 1

            results_matrix.append({
                "benchmark_id": bench["id"],
                "name": bench["name"],
                "description": bench["description"],
                "ao_star": {
                    "success": ao_res.success,
                    "cost": round(ao_res.solution_cost, 2) if ao_res.success else -1,
                    "runtime_ms": round(ao_time_ms, 2),
                    "expanded_nodes": ao_res.expanded_count,
                    "generated_nodes": ao_res.generated_count
                },
                "astar": astar_res.to_dict(),
                "greedy": greedy_res.to_dict()
            })

        n = len(benchmarks)
        summary = {
            "total_benchmarks": n,
            "algorithms": {
                "AO* (AND-OR Multi-Conjunct)": {
                    "avg_runtime_ms": round(ao_totals["runtime_ms"] / n, 2),
                    "avg_expansions": round(ao_totals["expansions"] / n, 1),
                    "feasibility_rate": f"{ao_totals['solved']}/{n} ({int(ao_totals['solved']/n*100)}%)",
                    "notes": "Handles decomposed subgoals (corridor navigation AND safety/reserve clearance checks)."
                },
                "A* (Single-Agent Projection)": {
                    "avg_runtime_ms": round(astar_totals["runtime_ms"] / n, 2),
                    "avg_expansions": round(astar_totals["expansions"] / n, 1),
                    "feasibility_rate": f"{astar_totals['solved']}/{n} ({int(astar_totals['solved']/n*100)}%)",
                    "notes": "Fastest on purely serial graphs; cannot represent contingent or decomposed AND-subgoals directly."
                },
                "Greedy Best-First": {
                    "avg_runtime_ms": round(greedy_totals["runtime_ms"] / n, 2),
                    "avg_expansions": round(greedy_totals["expansions"] / n, 1),
                    "feasibility_rate": f"{greedy_totals['solved']}/{n} ({int(greedy_totals['solved']/n*100)}%)",
                    "notes": "Fast expansion but suboptimal and frequently falls into safety traps or reserve depletion."
                }
            },
            "results_matrix": results_matrix
        }
        return summary
