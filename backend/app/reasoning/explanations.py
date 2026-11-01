"""
Explainable AI (XAI) Engine for AERON
Translates formal AO* planning traces and constraint evaluations into human-readable causal rationale.
"""

from typing import Dict, List, Any
from app.algorithms.ao_star import AOStarResult


class ExplanationEngine:
    @staticmethod
    def generate_plan_explanation(
        result: AOStarResult,
        waypoint_names: List[str],
        total_energy_kwh: float,
        final_soc_pct: float,
        reserve_limit_pct: float,
        priority: str,
        infeasible_nodes: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Synthesizes formal algorithmic reasoning into clear causal explanations.
        """
        summary = ""
        tradeoff_analysis = ""
        rejected_alternatives = []

        if result.success:
            route_str = " ➔ ".join(waypoint_names)
            summary = (
                f"Selected optimal plan along corridor: {route_str}. "
                f"Total multi-objective solution cost: {result.solution_cost:.2f}. "
                f"Energy consumption is projected at {total_energy_kwh:.2f} kWh, leaving {final_soc_pct:.1f}% SoC "
                f"(preserving the required {reserve_limit_pct:.1f}% reserve)."
            )

            # Analyze priority trade-off
            if priority == "SAFEST":
                tradeoff_analysis = "Planner prioritized routes minimizing corridor risk and turbulence over raw transit duration."
            elif priority == "LOWEST_ENERGY":
                tradeoff_analysis = "Planner prioritized low aerodynamic drag and gradual descent profiles to maximize regenerative energy capture."
            elif priority == "SHORTEST_TIME":
                tradeoff_analysis = "Planner favored high-speed skyway corridors at maximum cruising speed, trading higher battery draw for minimal duration."
            else:
                tradeoff_analysis = "Planner achieved balanced Pareto efficiency across flight time, battery draw, and exposure risk."

        else:
            summary = (
                f"Mission declared INFEASIBLE. AO* proved that no combination of available corridor hyperarcs "
                f"can satisfy both the terminal destination goal and the required safety/energy constraints."
            )
            tradeoff_analysis = "All candidate branches exceeded emergency battery reserve or encountered prohibited airspace restrictions."

        # Document why specific alternatives were rejected
        for node in infeasible_nodes:
            reason = node.get("state_data", {}).get("reason", "Violated heuristic/safety threshold")
            rejected_alternatives.append({
                "candidate": node.get("name", "Unknown Branch"),
                "status": "PRUNED / INFEASIBLE",
                "causal_reason": reason
            })

        return {
            "summary": summary,
            "tradeoff_analysis": tradeoff_analysis,
            "solution_cost": round(result.solution_cost, 2) if result.success else -1,
            "expanded_nodes": result.expanded_count,
            "generated_nodes": result.generated_count,
            "rejected_alternatives": rejected_alternatives,
            "termination_reason": result.termination_reason
        }
