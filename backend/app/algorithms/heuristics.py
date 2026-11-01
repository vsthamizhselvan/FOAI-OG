"""
Heuristics and Multi-Objective Cost Models for AERON Flight Planner
"""

import math
from typing import Dict, Any
from app.models.mission import Vector3D, MissionConfig, VehicleConfig
from app.simulation.physics import VehiclePhysics


class FlightHeuristics:
    @staticmethod
    def get_priority_weights(priority: str) -> Dict[str, float]:
        """
        Returns normalized weights for (time, energy, risk) based on mission priority.
        """
        p = priority.upper()
        if p == "SAFEST":
            return {"time": 0.15, "energy": 0.20, "risk": 0.65}
        elif p == "LOWEST_ENERGY":
            return {"time": 0.15, "energy": 0.70, "risk": 0.15}
        elif p == "SHORTEST_TIME":
            return {"time": 0.70, "energy": 0.15, "risk": 0.15}
        else:  # BALANCED
            return {"time": 0.40, "energy": 0.40, "risk": 0.20}

    @staticmethod
    def compute_edge_cost(
        telemetry: Dict[str, Any],
        corridor_risk: float,
        priority: str,
        risk_tolerance: float
    ) -> float:
        """
        Calculates multi-objective edge cost combining duration, energy, and risk.
        """
        w = FlightHeuristics.get_priority_weights(priority)
        duration_s = telemetry.get("duration_s", 1.0)
        energy_kwh = telemetry.get("energy_consumed_kwh", 0.1)

        # Risk penalty scales inversely with risk tolerance
        risk_multiplier = 1.0 / max(0.05, risk_tolerance)
        risk_cost = corridor_risk * 50.0 * risk_multiplier

        # Normalized cost calculation
        cost = (w["time"] * (duration_s / 10.0)) + \
               (w["energy"] * (energy_kwh * 4.0)) + \
               (w["risk"] * risk_cost)
        return max(0.1, cost)

    @staticmethod
    def estimate_heuristic(
        current_pos: Vector3D,
        dest_pos: Vector3D,
        vehicle: VehicleConfig,
        priority: str
    ) -> float:
        """
        Admissible lower-bound estimate to the destination.
        Calculates straight-line travel time and minimum level-flight energy.
        """
        w = FlightHeuristics.get_priority_weights(priority)
        dist_m = VehiclePhysics.distance_3d(current_pos, dest_pos)
        min_time_s = dist_m / vehicle.max_speed_mps

        # Ideal minimum cruise energy in kWh
        min_power_kw = 15.0
        min_energy_kwh = (min_power_kw * min_time_s) / 3600.0

        h = (w["time"] * (min_time_s / 10.0)) + (w["energy"] * (min_energy_kwh * 4.0))
        return max(0.0, h)
