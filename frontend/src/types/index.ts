export interface Vector3D {
  x: floatNumber;
  y: floatNumber;
  z: floatNumber;
}

type floatNumber = number;

export interface Waypoint {
  id: string;
  name: string;
  position: Vector3D;
  is_emergency_pad: boolean;
  pad_available: boolean;
  elevation_agl: number;
  description?: string;
}

export interface FlightCorridor {
  id: string;
  source_id: string;
  target_id: string;
  nominal_altitude: number;
  speed_limit_mps: number;
  risk_level: number;
  is_blocked: boolean;
  corridor_type: string;
}

export interface RestrictedZone {
  id: string;
  name: string;
  center: Vector3D;
  radius: number;
  min_altitude: number;
  max_altitude: number;
  active: boolean;
  severity: string;
}

export interface WeatherZone {
  id: string;
  name: string;
  center: Vector3D;
  radius: number;
  wind_speed_mps: number;
  wind_direction_deg: number;
  turbulence_factor: number;
  visibility_m: number;
  precipitation_intensity: number;
}

export interface Building {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  color?: string;
}

export interface VehicleConfig {
  model_name: string;
  battery_capacity_kwh: number;
  initial_battery_pct: number;
  emergency_reserve_pct: number;
  max_speed_mps: number;
  cruise_speed_mps: number;
  climb_rate_mps: number;
  descent_rate_mps: number;
  empty_mass_kg: number;
  drag_coefficient: number;
  frontal_area_m2: number;
  auxiliary_power_kw: number;
}

export interface MissionConfig {
  mission_id: string;
  name: string;
  start_waypoint_id: string;
  destination_waypoint_id: string;
  vehicle_config: VehicleConfig;
  priority: 'BALANCED' | 'SAFEST' | 'LOWEST_ENERGY' | 'SHORTEST_TIME';
  risk_tolerance: number;
  distance_vs_energy_weight: number;
  seed: number;
}

export interface DynamicEvent {
  event_type: 'OBSTACLE_BLOCK' | 'BATTERY_DROP' | 'WEATHER_SPIKE' | 'DESTINATION_CLOSED' | 'RESTRICTED_AIRSPACE_ACTIVE';
  target_id?: string;
  parameters: Record<string, any>;
  timestamp_sim_sec?: number;
  description: string;
}

export interface TraceStep {
  step_index: number;
  expanded_node_id: string;
  action_taken: string;
  root_cost: number;
  root_solved: boolean;
  marked_nodes: string[];
  marked_edges: Array<{ source: string; target: string; action: string }>;
  node_costs: Record<string, number>;
  explanation: string;
}

export interface GraphNodeData {
  node_id: string;
  name: string;
  node_type: 'OR' | 'AND' | 'GOAL' | 'FAIL' | 'CHECK';
  heuristic: number;
  cost: number;
  solved: boolean;
  infeasible: boolean;
  expanded: boolean;
  best_action: string | null;
  hyperarcs: Array<{
    action_id: string;
    action_name: string;
    cost: number;
    target_node_ids: string[];
    metadata: Record<string, any>;
  }>;
  state_data: Record<string, any>;
}

export interface RouteLeg {
  from_id: string;
  to_id: string;
  from_name: string;
  to_name: string;
  from_pos: Vector3D;
  to_pos: Vector3D;
  telemetry: {
    distance_m: number;
    duration_s: number;
    effective_speed_mps: number;
    effective_speed_kmh: number;
    average_power_kw: number;
    energy_consumed_kwh: number;
    battery_pct_cost: number;
    climb_descent_m: number;
  };
  corridor_id?: string;
}

export interface PlanResponse {
  success: boolean;
  solution_cost: number;
  route_waypoints: string[];
  route_waypoint_names: string[];
  terminal_landing_site: string;
  is_emergency_landing: boolean;
  total_distance_m: number;
  total_time_s: number;
  total_energy_kwh: number;
  initial_soc_pct: number;
  remaining_soc_pct: number;
  emergency_reserve_pct: number;
  route_legs: RouteLeg[];
  graph: Record<string, GraphNodeData>;
  trace: TraceStep[];
  explanation: {
    summary: string;
    tradeoff_analysis: string;
    solution_cost: number;
    expanded_nodes: number;
    generated_nodes: number;
    rejected_alternatives: Array<{ candidate: string; status: string; causal_reason: string }>;
    termination_reason: string;
  };
  safety_audit: {
    is_safe: boolean;
    hard_violations: string[];
    soft_warnings: string[];
    risk_score: number;
  };
}

export interface ScenarioOutcome {
  scenario_id: string;
  name: string;
  description: string;
  parameters_changed: Record<string, any>;
  is_feasible: boolean;
  plan_changed: boolean;
  route_waypoint_ids: string[];
  route_waypoint_names: string[];
  terminal_landing_site: string;
  is_emergency_landing: boolean;
  solution_cost: number;
  energy_consumed_kwh: number;
  remaining_soc_pct: number;
  travel_time_s: number;
  risk_score: number;
  expanded_nodes: number;
  causal_reason: string;
}

export interface CounterfactualResponse {
  baseline: ScenarioOutcome;
  counterfactuals: ScenarioOutcome[];
  total_scenarios_evaluated: number;
  insights: string[];
}

export interface DemoMission {
  id: string;
  name: string;
  description: string;
  config: MissionConfig;
  event: DynamicEvent | null;
  expected_outcome: string;
}
