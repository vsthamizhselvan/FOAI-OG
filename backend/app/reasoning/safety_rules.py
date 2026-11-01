"""
Rule-Based Safety Reasoning Layer
Enforces deterministic hard and soft constraints for autonomous aerial flight.
"""

from typing import Dict, List, Tuple, Any
from app.models.mission import MissionConfig, Waypoint, FlightCorridor, RestrictedZone
from app.simulation.physics import VehiclePhysics


class SafetyAuditResult:
    def __init__(self, is_safe: bool, hard_violations: List[str], soft_warnings: List[str], risk_score: float):
        self.is_safe = is_safe
        self.hard_violations = hard_violations
        self.soft_warnings = soft_warnings
        self.risk_score = risk_score

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_safe": self.is_safe,
            "hard_violations": self.hard_violations,
            "soft_warnings": self.soft_warnings,
            "risk_score": round(self.risk_score, 3)
        }


class SafetyRulesEngine:
    @staticmethod
    def audit_route(
        waypoints: List[Waypoint],
        corridors: List[FlightCorridor],
        restricted_zones: List[RestrictedZone],
        initial_soc_pct: float,
        reserve_limit_pct: float,
        total_energy_kwh: float,
        battery_capacity_kwh: float
    ) -> SafetyAuditResult:
        hard_violations: List[str] = []
        soft_warnings: List[str] = []
        accumulated_risk = 0.0

        # Rule 1: Reserve Battery Constraint (Hard Constraint)
        consumed_pct = (total_energy_kwh / battery_capacity_kwh) * 100.0
        final_soc = initial_soc_pct - consumed_pct
        if final_soc < reserve_limit_pct:
            hard_violations.append(
                f"CRITICAL: Final battery state ({final_soc:.1f}%) breaches required emergency reserve ({reserve_limit_pct:.1f}%)."
            )
        elif final_soc < reserve_limit_pct + 5.0:
            soft_warnings.append(
                f"CAUTION: Final battery state ({final_soc:.1f}%) is within 5% of emergency reserve limit."
            )

        # Rule 2: Destination or Safe Landing Requirement (Hard Constraint)
        if waypoints:
            terminal_wp = waypoints[-1]
            if not terminal_wp.pad_available:
                hard_violations.append(
                    f"CRITICAL: Terminal landing site '{terminal_wp.name}' is marked CLOSED or UNAVAILABLE."
                )
            if terminal_wp.is_emergency_pad:
                soft_warnings.append(
                    f"CONTINGENCY: Terminating at emergency landing pad '{terminal_wp.name}' instead of primary destination."
                )

        # Rule 3: Corridor Obstacles & Restricted Airspace (Hard Constraints)
        for i in range(len(waypoints) - 1):
            w1 = waypoints[i]
            w2 = waypoints[i + 1]

            # Find matching corridor
            matching_cor = next((c for c in corridors if c.source_id == w1.id and c.target_id == w2.id), None)
            if matching_cor:
                accumulated_risk += matching_cor.risk_level
                if matching_cor.is_blocked:
                    hard_violations.append(f"CRITICAL: Corridor {matching_cor.id} ({w1.name} -> {w2.name}) is blocked by obstacles.")

            # Restricted zones
            for rz in restricted_zones:
                if rz.active:
                    seg_min_z = min(w1.position.z, w2.position.z)
                    seg_max_z = max(w1.position.z, w2.position.z)
                    if not (seg_max_z < rz.min_altitude or seg_min_z > rz.max_altitude):
                        from app.simulation.environment import point_segment_distance_2d
                        dist = point_segment_distance_2d(rz.center.x, rz.center.y, w1.position.x, w1.position.y, w2.position.x, w2.position.y)
                        if dist < rz.radius:
                            hard_violations.append(
                                f"CRITICAL: Flight leg {w1.name} -> {w2.name} breaches prohibited airspace '{rz.name}'."
                            )

        # Rule 4: High Risk Soft Warning
        normalized_risk = min(1.0, accumulated_risk / max(1, len(waypoints)))
        if normalized_risk > 0.4:
            soft_warnings.append(f"ADVISORY: Average leg risk ({normalized_risk:.2f}) exceeds standard safety baseline (0.40).")

        is_safe = len(hard_violations) == 0
        return SafetyAuditResult(
            is_safe=is_safe,
            hard_violations=hard_violations,
            soft_warnings=soft_warnings,
            risk_score=normalized_risk
        )
