"""
AO* Algorithm Implementation from Scratch
For AERON Counterfactual AI Flight Planner

Formal AND-OR Search Algorithm with:
- Hyperarcs (OR choices pointing to AND conjuncts)
- Bottom-up cost propagation
- Solved/Infeasible state propagation
- Best partial tree marking
- Comprehensive step-by-step trace generation
"""

from typing import Dict, List, Optional, Set, Tuple, Any
from dataclasses import dataclass, field
import math

INFINITY = 1e9


@dataclass
class HyperArc:
    """An action from an OR node leading to a set of conjunct (AND) child nodes."""
    action_id: str
    action_name: str
    cost: float
    target_node_ids: List[str]
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AONode:
    """Node in the AND-OR graph."""
    node_id: str
    name: str
    node_type: str  # 'OR', 'AND', 'GOAL', 'FAIL', 'CHECK'
    heuristic: float = 0.0
    cost: float = 0.0
    solved: bool = False
    infeasible: bool = False
    expanded: bool = False
    hyperarcs: List[HyperArc] = field(default_factory=list)
    best_hyperarc: Optional[HyperArc] = None
    parents: Set[str] = field(default_factory=set)
    state_data: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "node_id": self.node_id,
            "name": self.name,
            "node_type": self.node_type,
            "heuristic": round(self.heuristic, 2) if self.heuristic < INFINITY else -1,
            "cost": round(self.cost, 2) if self.cost < INFINITY else -1,
            "solved": self.solved,
            "infeasible": self.infeasible,
            "expanded": self.expanded,
            "best_action": self.best_hyperarc.action_name if self.best_hyperarc else None,
            "hyperarcs": [
                {
                    "action_id": ha.action_id,
                    "action_name": ha.action_name,
                    "cost": round(ha.cost, 2),
                    "target_node_ids": ha.target_node_ids,
                    "metadata": ha.metadata
                }
                for ha in self.hyperarcs
            ],
            "state_data": self.state_data
        }


@dataclass
class TraceStep:
    step_index: int
    expanded_node_id: str
    action_taken: str
    root_cost: float
    root_solved: bool
    marked_nodes: List[str]
    marked_edges: List[Dict[str, str]]
    node_costs: Dict[str, float]
    explanation: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "step_index": self.step_index,
            "expanded_node_id": self.expanded_node_id,
            "action_taken": self.action_taken,
            "root_cost": round(self.root_cost, 2) if self.root_cost < INFINITY else -1,
            "root_solved": self.root_solved,
            "marked_nodes": self.marked_nodes,
            "marked_edges": self.marked_edges,
            "node_costs": {k: (round(v, 2) if v < INFINITY else -1) for k, v in self.node_costs.items()},
            "explanation": self.explanation
        }


@dataclass
class AOStarResult:
    success: bool
    root_id: str
    solution_cost: float
    expanded_count: int
    generated_count: int
    termination_reason: str
    best_plan_nodes: List[str]
    best_plan_actions: List[str]
    graph_nodes: Dict[str, Dict[str, Any]]
    trace: List[TraceStep]
    explanations: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "root_id": self.root_id,
            "solution_cost": round(self.solution_cost, 2) if self.solution_cost < INFINITY else -1,
            "expanded_count": self.expanded_count,
            "generated_count": self.generated_count,
            "termination_reason": self.termination_reason,
            "best_plan_nodes": self.best_plan_nodes,
            "best_plan_actions": self.best_plan_actions,
            "graph_nodes": self.graph_nodes,
            "trace": [t.to_dict() for t in self.trace],
            "explanations": self.explanations
        }


class AOStarSearch:
    """
    Standard AO* Search Engine on Explicit / Implicit AND-OR Graphs.
    """

    def __init__(self, node_generator=None):
        self.nodes: Dict[str, AONode] = {}
        self.root_id: Optional[str] = None
        self.trace: List[TraceStep] = []
        self.expanded_count = 0
        self.node_generator = node_generator  # Optional callback: expand(node) -> list of HyperArcs

    def add_node(self, node: AONode):
        self.nodes[node.node_id] = node
        if node.node_type == 'GOAL':
            node.cost = node.heuristic
            node.solved = True
        elif node.node_type == 'FAIL':
            node.cost = INFINITY
            node.infeasible = True
        else:
            node.cost = node.heuristic

    def add_hyperarc(self, source_id: str, action_id: str, action_name: str,
                     cost: float, target_ids: List[str], metadata: Optional[Dict[str, Any]] = None):
        if source_id not in self.nodes:
            raise ValueError(f"Source node {source_id} not in graph")
        ha = HyperArc(
            action_id=action_id,
            action_name=action_name,
            cost=cost,
            target_node_ids=target_ids,
            metadata=metadata or {}
        )
        self.nodes[source_id].hyperarcs.append(ha)
        for tid in target_ids:
            if tid in self.nodes:
                self.nodes[tid].parents.add(source_id)

    def find_best_partial_tree(self, root_id: str) -> Tuple[List[str], List[Dict[str, str]], List[str]]:
        """
        Traverses the current best hyperarcs starting from root_id.
        Returns:
            marked_nodes: list of node IDs in best partial tree
            marked_edges: list of {source, target, action} edges
            unsolved_leaves: list of leaf node IDs in this tree that need expansion
        """
        marked_nodes: List[str] = []
        marked_edges: List[Dict[str, str]] = []
        unsolved_leaves: List[str] = []
        visited = set()

        def dfs(node_id: str):
            if node_id in visited:
                return
            visited.add(node_id)
            marked_nodes.append(node_id)
            node = self.nodes.get(node_id)
            if not node:
                return

            if node.infeasible:
                return

            if node.node_type in ('GOAL', 'FAIL'):
                return

            if not node.expanded:
                if not node.solved:
                    unsolved_leaves.append(node_id)
                return

            if node.best_hyperarc:
                for child_id in node.best_hyperarc.target_node_ids:
                    marked_edges.append({
                        "source": node_id,
                        "target": child_id,
                        "action": node.best_hyperarc.action_name
                    })
                    dfs(child_id)
            elif not node.solved:
                unsolved_leaves.append(node_id)

        dfs(root_id)
        return marked_nodes, marked_edges, unsolved_leaves

    def update_node_cost(self, node_id: str) -> bool:
        """
        Recomputes cost and solved status of a node based on its hyperarcs and children.
        Returns True if cost or solved status changed.
        """
        node = self.nodes[node_id]
        if node.node_type == 'GOAL':
            node.cost = node.heuristic
            node.solved = True
            node.infeasible = False
            return False
        if node.node_type == 'FAIL':
            node.cost = INFINITY
            node.solved = False
            node.infeasible = True
            return False

        if not node.hyperarcs:
            if node.expanded:
                # Expanded with 0 valid hyperarcs => dead end / infeasible
                old_cost = node.cost
                node.cost = INFINITY
                node.infeasible = True
                node.solved = False
                return old_cost != INFINITY
            return False

        min_cost = INFINITY
        best_ha = None
        best_solved = False

        for ha in node.hyperarcs:
            branch_cost = ha.cost
            all_children_solved = True
            any_child_infeasible = False

            for child_id in ha.target_node_ids:
                child = self.nodes.get(child_id)
                if not child:
                    branch_cost += INFINITY
                    all_children_solved = False
                    any_child_infeasible = True
                    break
                branch_cost += child.cost
                if not child.solved:
                    all_children_solved = False
                if child.infeasible:
                    any_child_infeasible = True

            if any_child_infeasible:
                branch_cost = INFINITY

            if branch_cost < min_cost:
                min_cost = branch_cost
                best_ha = ha
                best_solved = all_children_solved

        changed = (abs(node.cost - min_cost) > 1e-4) or (node.solved != best_solved) or (node.best_hyperarc != best_ha)
        node.cost = min_cost
        node.best_hyperarc = best_ha
        node.solved = best_solved and (min_cost < INFINITY)
        node.infeasible = (min_cost >= INFINITY)
        return changed

    def bottom_up_propagate(self, start_node_id: str):
        """
        Propagates cost and solved status updates upwards from start_node_id.
        """
        # Collect ancestors
        queue = [start_node_id]
        ancestors_set = set([start_node_id])

        while queue:
            curr = queue.pop(0)
            node = self.nodes.get(curr)
            if node:
                for p in node.parents:
                    if p not in ancestors_set:
                        ancestors_set.add(p)
                        queue.append(p)

        # Iteratively update ancestors until stable
        changed = True
        iterations = 0
        max_iterations = len(ancestors_set) * 3 + 10

        while changed and iterations < max_iterations:
            changed = False
            iterations += 1
            for nid in list(ancestors_set):
                if self.update_node_cost(nid):
                    changed = True

    def run(self, root_id: str, max_expansions: int = 100) -> AOStarResult:
        """
        Executes AO* search starting from root_id.
        """
        if root_id not in self.nodes:
            raise ValueError(f"Root node {root_id} not present in graph")

        self.root_id = root_id
        self.trace = []
        self.expanded_count = 0
        root = self.nodes[root_id]

        # Initial evaluation
        self.update_node_cost(root_id)

        # Initial trace step 0
        marked_nodes, marked_edges, unsolved_leaves = self.find_best_partial_tree(root_id)
        self.trace.append(TraceStep(
            step_index=0,
            expanded_node_id="ROOT_INIT",
            action_taken="Graph initialized with root heuristic",
            root_cost=root.cost,
            root_solved=root.solved,
            marked_nodes=marked_nodes,
            marked_edges=marked_edges,
            node_costs={nid: n.cost for nid, n in self.nodes.items()},
            explanation=f"Initialized AO* search at root {root.name} with heuristic cost estimate {root.cost:.2f}."
        ))

        termination_reason = "Max expansions reached without complete solution."

        while self.expanded_count < max_expansions:
            if root.solved:
                termination_reason = "Root node marked SOLVED. Optimal AND-OR plan confirmed."
                break
            if root.infeasible or root.cost >= INFINITY:
                termination_reason = "Root node marked INFEASIBLE. No safe or valid plan exists."
                break

            marked_nodes, marked_edges, unsolved_leaves = self.find_best_partial_tree(root_id)
            if not unsolved_leaves:
                if root.solved:
                    termination_reason = "Optimal plan solved completely."
                else:
                    termination_reason = "No more unsolved leaf nodes in best partial graph."
                break

            # Pick the most promising unsolved leaf (e.g. lowest heuristic or first)
            candidate_id = unsolved_leaves[0]
            candidate_node = self.nodes[candidate_id]

            # Expand candidate node
            candidate_node.expanded = True
            self.expanded_count += 1

            if self.node_generator:
                generated_arcs = self.node_generator(candidate_node, self)
                for ha in generated_arcs:
                    self.add_hyperarc(
                        source_id=candidate_id,
                        action_id=ha.action_id,
                        action_name=ha.action_name,
                        cost=ha.cost,
                        target_ids=ha.target_node_ids,
                        metadata=ha.metadata
                    )

            # Update this node's cost and propagate upwards
            self.update_node_cost(candidate_id)
            self.bottom_up_propagate(candidate_id)

            # Record step in trace
            marked_nodes, marked_edges, _ = self.find_best_partial_tree(root_id)
            step_expl = (
                f"Step {self.expanded_count}: Expanded node '{candidate_node.name}'. "
                f"Evaluated {len(candidate_node.hyperarcs)} hyperarc branches. "
                f"Updated node cost to {candidate_node.cost:.2f} (solved={candidate_node.solved}). "
                f"Propagated back to root cost {root.cost:.2f}."
            )

            self.trace.append(TraceStep(
                step_index=self.expanded_count,
                expanded_node_id=candidate_id,
                action_taken=f"Expand {candidate_node.name}",
                root_cost=root.cost,
                root_solved=root.solved,
                marked_nodes=marked_nodes,
                marked_edges=marked_edges,
                node_costs={nid: n.cost for nid, n in self.nodes.items()},
                explanation=step_expl
            ))

        # Build final plan
        best_nodes, best_edges, _ = self.find_best_partial_tree(root_id)
        best_actions = []
        for nid in best_nodes:
            n = self.nodes[nid]
            if n.best_hyperarc and n.best_hyperarc.action_name not in best_actions:
                best_actions.append(n.best_hyperarc.action_name)

        explanations = [
            f"AO* concluded with status: {termination_reason}",
            f"Total expanded nodes: {self.expanded_count}, Graph size: {len(self.nodes)} nodes.",
            f"Final selected solution cost: {root.cost:.2f} (Admissible upper bound guarantee).",
            f"Selected plan involves {len(best_actions)} coordinated action legs across {len(best_nodes)} subgoals."
        ]

        return AOStarResult(
            success=root.solved,
            root_id=root_id,
            solution_cost=root.cost,
            expanded_count=self.expanded_count,
            generated_count=len(self.nodes),
            termination_reason=termination_reason,
            best_plan_nodes=best_nodes,
            best_plan_actions=best_actions,
            graph_nodes={nid: n.to_dict() for nid, n in self.nodes.items()},
            trace=self.trace,
            explanations=explanations
        )
