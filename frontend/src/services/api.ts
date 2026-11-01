import {
  MissionConfig,
  PlanResponse,
  CounterfactualResponse,
  DemoMission,
  DynamicEvent,
  Waypoint,
  FlightCorridor,
  RestrictedZone,
  WeatherZone,
  Building
} from '../types';

const API_BASE = '/api';

export interface EnvironmentData {
  waypoints: Waypoint[];
  corridors: FlightCorridor[];
  restricted_zones: RestrictedZone[];
  weather_zones: WeatherZone[];
  buildings: Building[];
}

export const ApiService = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Failed to fetch system health');
    return res.json();
  },

  async getEnvironment(): Promise<EnvironmentData> {
    const res = await fetch(`${API_BASE}/environment`);
    if (!res.ok) throw new Error('Failed to load 3D environment layout');
    return res.json();
  },

  async getDemoMissions(): Promise<DemoMission[]> {
    const res = await fetch(`${API_BASE}/missions/demos`);
    if (!res.ok) throw new Error('Failed to load demo scenarios');
    return res.json();
  },

  async planMission(config: MissionConfig): Promise<PlanResponse> {
    const res = await fetch(`${API_BASE}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Mission planning failed');
    }
    return res.json();
  },

  async getCounterfactuals(config: MissionConfig): Promise<CounterfactualResponse> {
    const res = await fetch(`${API_BASE}/counterfactuals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Counterfactual analysis failed');
    }
    return res.json();
  },

  async replanMission(payload: {
    config: MissionConfig;
    current_waypoint_id: string;
    current_soc_pct: number;
    event: DynamicEvent;
    original_route: string[];
  }) {
    const res = await fetch(`${API_BASE}/replan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Dynamic replanning failed');
    }
    return res.json();
  },

  async evaluateBenchmarks() {
    const res = await fetch(`${API_BASE}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Algorithm evaluation failed');
    }
    return res.json();
  }
};
