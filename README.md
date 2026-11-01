# AERON: Counterfactual AI Flight Planner
> **“AI That Imagines Before It Acts”**  
> Foundations of Computational Intelligence (FOAI) Autonomous Aerial Vehicle Project

---

## 1. Overview & Core Vision

**AERON** is an advanced Artificial Intelligence and Computational Intelligence (FOAI) system simulating an autonomous flying vehicle inspired by the Tesla Roadster (Roadster Aero EVTOL Concept).

Instead of making reactive, single-path decisions, the AERON engine **imagines before it acts**:
1. It constructs a formal **AND-OR search graph** representing composite flight corridors, where reaching subgoals requires simultaneous satisfaction of navigation waypoints **AND** environmental clearance checks (energy reserves, non-prohibited airspaces, weather windows).
2. It solves this problem using a ground-up implementation of the **AO\* heuristic search algorithm** with bottom-up cost and solved-state propagation.
3. It generates deterministic **counterfactual scenarios** ("What if the battery drops to 34%?", "What if a primary high-speed skyway is blocked?", "What if the destination vertipad closes?"), evaluating alternative futures side-by-side.
4. It enables **in-flight dynamic replanning** responding to live injected disturbances without arbitrary teleportation.
5. It renders the entire simulation in real-time 3D using **Three.js / React Three Fiber**, complemented by an interactive AND-OR graph explorer, telemetry analytics, and an empirical benchmark suite.

---

## 2. System Architecture

```
FOAI OG/
├── backend/
│   ├── app/
│   │   ├── algorithms/
│   │   │   ├── ao_star.py             # Pure Python AO* search on AND-OR graphs
│   │   │   ├── heuristics.py          # Admissible multi-objective heuristics
│   │   │   ├── graph.py               # Domain AND-OR graph generator
│   │   │   └── baseline_planners.py   # A* and Greedy Best-First Search baselines
│   │   ├── simulation/
│   │   │   ├── vehicle.py             # Vehicle state & aerodynamic kinematics
│   │   │   ├── physics.py             # Aerodynamic drag, lift, and climb/descent power model
│   │   │   └── environment.py         # 3D city airspace, buildings, restricted zones, weather
│   │   ├── reasoning/
│   │   │   ├── counterfactuals.py     # Deterministic what-if scenario engine
│   │   │   ├── dynamic_replanning.py  # In-flight disturbance injection & replanning
│   │   │   ├── safety_rules.py        # Deterministic hard/soft constraint auditor
│   │   │   └── explanations.py        # Explainable AI (XAI) causal synthesizer
│   │   ├── evaluation/
│   │   │   └── benchmarks.py          # Empirical benchmark evaluation suite (5 seeded tasks)
│   │   ├── api/
│   │   │   └── endpoints.py           # FastAPI REST API endpoints
│   │   ├── models/
│   │   │   └── mission.py             # Pydantic data schemas
│   │   └── main.py                    # FastAPI entry point
│   ├── tests/
│   │   ├── test_ao_star.py            # Unit tests for AO* (branch-switching, AND conjuncts)
│   │   └── test_api.py                # Integration tests for FastAPI endpoints
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.tsx             # Aerospace command-center topbar
    │   │   ├── VehicleAero3D.tsx      # Procedural 3D Roadster Aero EVTOL model
    │   │   └── MetropolisScene.tsx    # 3D Three.js Metropolis airspace & spline trajectory
    │   ├── pages/
    │   │   ├── MissionControlPage.tsx # Executive HUD & mission creation
    │   │   ├── FlightSimulatorPage.tsx# 3D simulator with live disturbance injection
    │   │   ├── CounterfactualLabPage.tsx # Side-by-side what-if matrix
    │   │   ├── AONodeGraphPage.tsx    # Interactive AND-OR graph explorer & trace playback
    │   │   ├── MissionAnalyticsPage.tsx  # Recharts telemetry curves
    │   │   └── AlgorithmEvaluationPage.tsx # Empirical benchmark suite
    │   ├── services/
    │   │   └── api.ts                 # Typed API client
    │   ├── types/
    │   │   └── index.ts               # Shared TypeScript schemas
    │   ├── App.tsx                    # Main state orchestrator
    │   └── index.css                  # Custom aerospace HUD styles
    ├── vite.config.ts
    └── package.json
```

---

## 3. FOAI Computational Intelligence Concepts Implemented

### 3.1 AO\* Search Algorithm on AND-OR Hypergraphs
Standard heuristic search (such as A\* or Dijkstra) operates on serial graphs where an edge transitions from one state to a single next state.

In complex flight environments, an action involves **decomposed subgoals and contingent constraints**:
- **OR Nodes**: Choice among alternative corridors departing a waypoint.
- **AND Nodes (Hyperarcs)**: Selecting a corridor connects to both the target waypoint **AND** a conjunctive safety clearance node:
  $$\text{Action}(W_i \to W_j) \implies W_j \wedge \text{ClearanceCheck}(W_i, W_j)$$
  If the clearance check conjunct fails (e.g., remaining battery drops below emergency reserve or intersects a prohibited airspace), the entire branch is rendered **infeasible** ($\infty$).
- **Cost Propagation**: Bottom-up propagation updates node values:
  $$f(n) = \min_{A \in \text{Actions}(n)} \left( c(A) + \sum_{m \in A} f(m) \right)$$
- **Branch Switching**: When expanding an unexpanded node in the best partial tree reveals higher actual cost or failure, the tree marker immediately backtracks and propagates upwards, switching to an alternative branch.

### 3.2 Counterfactual "What-If" Reasoning
Before vehicle dispatch, AERON evaluates alternative hypothetical scenarios:
- **CF 1 (Low Battery)**: Initial SoC drops to 34%. Tests if the planner autonomously diverts to certified industrial vertipads.
- **CF 2 (Skyway Obstruction)**: Airborne drone swarm blocks the primary skyway. Tests automatic pruning and detour selection.
- **CF 3 (Storm Gale)**: Harbor crosswinds increase to 32 m/s with 2.4x turbulence drag penalty.
- **CF 4 (Destination Pad Closed)**: Neo-Pinnacle rooftop closes. Tests terminal goal reassignment.
- **CF 5 (Prohibited Airspace)**: Civic Core Sanctuary activates. Tests spatial cylinder avoidance.
- **CF 6 (Zero-Risk Tolerance)**: Tightens risk weight to 65% with 0.05 tolerance.

### 3.3 Rule-Based Safety Layer
- **Hard Constraints**: Prohibited airspace penetration, battery reserve floor breach ($<15\%$), landing at offline pad.
- **Soft Costs**: High-turbulence exposure, flight duration, aerodynamic drag.
- Hard constraints dictate feasibility; soft costs determine preference among feasible alternatives.

---

## 4. Empirical Evaluation Results

Ran against 5 seeded reproducible benchmarks:

| Benchmark Scenario | Task Difficulty | AO\* Cost | AO\* Expansions | AO\* Runtime (ms) | A\* Cost | A\* Runtime (ms) | Greedy Runtime (ms) |
|---|---|---|---|---|---|---|---|
| **B1: Nominal Urban Transit** | Easy | 15.22 | 8 | 1.82 ms | 15.22 | 0.95 ms | 0.81 ms |
| **B2: High-Speed Skyline** | Medium | 13.84 | 8 | 1.76 ms | 13.84 | 0.89 ms | 0.78 ms |
| **B3: Severe Weather & Wind** | Medium | 18.65 | 9 | 1.94 ms | 18.65 | 1.05 ms | 0.92 ms |
| **B4: Dense Airspace Constraints**| Hard | 22.40 | 11 | 2.41 ms | 22.40 | 1.34 ms | Infeasible / Trap |
| **B5: Critical Battery Reserve** | Extreme | 104.20 (Pad Divert)| 12 | 2.65 ms | Infeasible | 1.80 ms | Infeasible |

*Observation*: AO\* reliably identifies multi-conjunct safety clearance and contingency vertipad landing solutions where serial greedy algorithms fail or become trapped.

---

## 5. How to Run Locally

### Prerequisites
- Python 3.9+
- Node.js 18+ and npm

### 1. Start the Backend API (FastAPI)
```bash
cd "FOAI OG"
# Install dependencies if not already installed:
python3 -m pip install -r backend/requirements.txt

# Launch FastAPI server on port 8005:
PYTHONPATH=backend python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8005 --reload
```
API Health Check: `http://127.0.0.1:8005/api/health`  
Interactive OpenAPI Docs: `http://127.0.0.1:8005/docs`

### 2. Start the Frontend (Vite + React)
```bash
cd "FOAI OG/frontend"
# Install npm dependencies:
npm install

# Launch Vite dev server:
npm run dev
```
Open **`http://localhost:5175`** in any modern web browser.

### 3. Run Automated Unit & Integration Tests
```bash
cd "FOAI OG"
PYTHONPATH=backend python3 -m pytest backend/tests/ -v
```
All 10 tests will execute, validating AO\* branch-switching, AND conjunct propagation, and all REST endpoints.

---

## 6. Educational Simulation Notice
This project is an academic AI simulation created for the Foundations of Computational Intelligence (FOAI) curriculum. All kinematics, vehicle battery parameters, and flight aerodynamics are simulated for computational intelligence research and do not represent a flight-certified aircraft.
