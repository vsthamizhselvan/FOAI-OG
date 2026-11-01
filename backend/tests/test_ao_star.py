"""
Unit Tests for AO* Algorithm on formal AND-OR Graphs
Verifies:
1. Classic branch switching when an AND conjunct reveals higher cost after expansion.
2. Conjunctive AND requirement: both subgoals must be solved.
3. Infeasible graph handling when constraints or obstacles block all paths.
"""

import pytest
from app.algorithms.ao_star import AOStarSearch, AONode, HyperArc, INFINITY


def test_classic_ao_star_branch_switching():
    """
    Classic Rich & Knight / Nilsson test case:
    Root A has two choices:
    - Branch 1: Action 'OR_B' -> [B] (arc cost = 2, h(B) = 4) => total estimated = 6
    - Branch 2: Action 'AND_CD' -> [C, D] (arc cost = 1, h(C) = 2, h(D) = 2) => total estimated = 5

    Initially, Branch 2 is chosen because 5 < 6.
    When C is expanded, its true sub-path costs 8.
    Cost of Branch 2 becomes 1 + 8 + 2 = 11 > 6.
    The algorithm MUST switch its best partial tree to Branch 1 (B)!
    Then B is expanded to Goal (cost 3), yielding final optimal solution via Branch 1 with cost 2 + 3 = 5.
    """
    search = AOStarSearch()

    # Define nodes
    search.add_node(AONode("A", "Root A", "OR", heuristic=5.0))
    search.add_node(AONode("B", "Subgoal B", "OR", heuristic=4.0))
    search.add_node(AONode("C", "Subgoal C", "OR", heuristic=2.0))
    search.add_node(AONode("D", "Subgoal D", "OR", heuristic=2.0))
    search.add_node(AONode("G_B", "Goal via B", "GOAL", heuristic=0.0))
    search.add_node(AONode("G_C", "Goal via C", "GOAL", heuristic=0.0))
    search.add_node(AONode("G_D", "Goal via D", "GOAL", heuristic=0.0))

    # Add Root HyperArcs
    search.add_hyperarc("A", "act_B", "Action via B", cost=2.0, target_ids=["B"])
    search.add_hyperarc("A", "act_CD", "Action via C and D", cost=1.0, target_ids=["C", "D"])

    # Expand B connections (cost to G_B is 3)
    search.add_hyperarc("B", "act_B_goal", "B to Goal", cost=3.0, target_ids=["G_B"])

    # Expand C connections (cost to G_C is surprisingly high: 8)
    search.add_hyperarc("C", "act_C_goal", "C to Goal", cost=8.0, target_ids=["G_C"])

    # Expand D connections (cost to G_D is 2)
    search.add_hyperarc("D", "act_D_goal", "D to Goal", cost=2.0, target_ids=["G_D"])

    # Run search
    result = search.run("A")

    assert result.success is True
    # Final cost should be via B: arc(2) + cost(B=3) = 5.0
    assert result.solution_cost == pytest.approx(5.0, abs=1e-3)
    assert "A" in result.best_plan_nodes
    assert "B" in result.best_plan_nodes
    assert "G_B" in result.best_plan_nodes
    # C and D should NOT be in the final solution
    assert "C" not in result.best_plan_nodes
    assert "D" not in result.best_plan_nodes

    # Check trace: Step 1 (after root A expansion) should have chosen act_CD (C and D in marked nodes)
    trace_step_1 = result.trace[1]
    assert "C" in trace_step_1.marked_nodes or "D" in trace_step_1.marked_nodes


def test_and_branch_both_must_succeed():
    """
    In an AND hyperarc, if one conjunct fails / is infeasible,
    the hyperarc must not solve, forcing AO* to evaluate alternative branches.
    """
    search = AOStarSearch()
    search.add_node(AONode("START", "Start", "OR", heuristic=10.0))
    search.add_node(AONode("P1", "Primary Leg", "OR", heuristic=4.0))
    search.add_node(AONode("P2_CHECK", "Safety Check", "OR", heuristic=2.0))
    search.add_node(AONode("ALT", "Alternative Route", "OR", heuristic=12.0))
    search.add_node(AONode("GOAL", "Goal Vertiport", "GOAL", heuristic=0.0))
    search.add_node(AONode("FAIL_HAZARD", "Corridor Hazard", "FAIL", heuristic=INFINITY))

    # Choice 1: AND branch [P1, P2_CHECK]
    search.add_hyperarc("START", "act_primary", "Fly High-Speed Corridor", cost=3.0, target_ids=["P1", "P2_CHECK"])
    # Choice 2: Single branch [ALT]
    search.add_hyperarc("START", "act_alt", "Fly Detour Bypass", cost=8.0, target_ids=["ALT"])

    # P1 connects to GOAL
    search.add_hyperarc("P1", "act_p1_goal", "P1 to Goal", cost=2.0, target_ids=["GOAL"])
    # P2_CHECK leads to FAIL_HAZARD (e.g. storm or restricted zone detected)
    search.add_hyperarc("P2_CHECK", "act_p2_hazard", "Check reveals hazard", cost=1.0, target_ids=["FAIL_HAZARD"])

    # ALT connects to GOAL
    search.add_hyperarc("ALT", "act_alt_goal", "Detour to Goal", cost=4.0, target_ids=["GOAL"])

    result = search.run("START")

    assert result.success is True
    # The primary corridor fails because P2_CHECK is infeasible!
    # Therefore START chooses the detour: cost = 8 (arc) + 4 (ALT->GOAL) + 0 = 12.0
    assert result.solution_cost == pytest.approx(12.0, abs=1e-3)
    assert "ALT" in result.best_plan_nodes
    assert "P1" not in result.best_plan_nodes


def test_infeasible_graph_detection():
    """
    When all paths lead to failure, root must be marked INFEASIBLE.
    """
    search = AOStarSearch()
    search.add_node(AONode("S", "Start", "OR", heuristic=5.0))
    search.add_node(AONode("F1", "Hazard 1", "FAIL", heuristic=INFINITY))
    search.add_node(AONode("F2", "Hazard 2", "FAIL", heuristic=INFINITY))

    search.add_hyperarc("S", "act1", "Path 1", cost=2.0, target_ids=["F1"])
    search.add_hyperarc("S", "act2", "Path 2", cost=3.0, target_ids=["F2"])

    result = search.run("S")
    assert result.success is False
    assert result.solution_cost == -1 or result.solution_cost >= INFINITY
    assert "INFEASIBLE" in result.termination_reason
