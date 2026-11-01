"""
Pydantic Models for AERON Flight Planner
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class Vector3D(BaseModel):
    x: float
    y: float
    z: float  # altitude


class Waypoint(BaseModel):
    id: str
    name: str
    position: Vector3D
    is_emergency_pad: bool = False
    pad_available: bool = True
    elevation_agl: float = 0.0  # Above ground level
    description: Optional[str] = None


class RestrictedZone(BaseModel):
    id: str
    name: str
    center: Vector3D
    radius: float
    min_altitude: float
    max_altitude: float
    active: bool = True
    severity: str = "PROHIBITED"  # PROHIBITED, RESTRICTED, ADVISORY


class WeatherZone(BaseModel):
    id: str
    name: str
    center: Vector3D
    radius: float
    wind_speed_mps: float = 12.0
    wind_direction_deg: float = 45.0
    turbulence_factor: float = 1.4  # multiplier on energy consumption
    visibility_m: float = 8000.0
    precipitation_intensity: float = 0.0  # 0.0 to 1.0


class Building(BaseModel):
    id: str
    name: str
    x: float
    y: float
    z: float  # height
    width: float
    depth: float
    color: Optional[str] = None


class FlightCorridor(BaseModel):
    id: str
    source_id: str
    target_id: str
    nominal_altitude: float
    speed_limit_mps: float = 55.0
    risk_level: float = 0.1  # 0.0 to 1.0
    is_blocked: bool = False
    corridor_type: str = "SKYWAY"  # SKYWAY, LOW_ALT_TRANSIT, EMERGENCY_DESCENT


class VehicleConfig(BaseModel):
    model_name: str = "Tesla Roadster Aero (Simulated EVTOL Concept)"
    battery_capacity_kwh: float = 100.0
    initial_battery_pct: float = 85.0
    emergency_reserve_pct: float = 15.0
    max_speed_mps: float = 60.0  # ~216 km/h
    cruise_speed_mps: float = 45.0  # ~162 km/h
    climb_rate_mps: float = 8.0
    descent_rate_mps: float = 6.0
    empty_mass_kg: float = 1850.0
    drag_coefficient: float = 0.22
    frontal_area_m2: float = 2.1
    auxiliary_power_kw: float = 1.2


class MissionConfig(BaseModel):
    mission_id: str
    name: str
    start_waypoint_id: str = "WP_START"
    destination_waypoint_id: str = "WP_DESTINATION"
    vehicle_config: VehicleConfig = Field(default_factory=VehicleConfig)
    priority: str = "BALANCED"  # BALANCED, SAFEST, LOWEST_ENERGY, SHORTEST_TIME
    risk_tolerance: float = 0.2  # 0.0 (strictly safe) to 1.0 (accepts high risk)
    distance_vs_energy_weight: float = 0.5  # 0.0 (favor time/dist) to 1.0 (favor energy)
    seed: int = 42


class DynamicEvent(BaseModel):
    event_type: str  # OBSTACLE_BLOCK, BATTERY_DROP, WEATHER_SPIKE, DESTINATION_CLOSED
    target_id: Optional[str] = None  # corridor_id or waypoint_id
    parameters: Dict[str, Any] = Field(default_factory=dict)
    timestamp_sim_sec: float = 0.0
    description: str = ""
