"""
3D City Airspace Environment for AERON Flight Planner
"""

from typing import Dict, List, Optional, Tuple
import math
from app.models.mission import (
    Vector3D, Waypoint, RestrictedZone, WeatherZone,
    Building, FlightCorridor
)


def point_segment_distance_2d(px: float, py: float, x1: float, y1: float, x2: float, y2: float) -> float:
    dx = x2 - x1
    dy = y2 - y1
    if dx == 0 and dy == 0:
        return math.hypot(px - x1, py - y1)
    t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    proj_x = x1 + t * dx
    proj_y = y1 + t * dy
    return math.hypot(px - proj_x, py - proj_y)


class AirspaceEnvironment:
    def __init__(self, seed: int = 42):
        self.seed = seed
        self.waypoints: Dict[str, Waypoint] = {}
        self.corridors: Dict[str, FlightCorridor] = {}
        self.restricted_zones: Dict[str, RestrictedZone] = {}
        self.weather_zones: Dict[str, WeatherZone] = {}
        self.buildings: List[Building] = []
        self._initialize_default_airspace()

    def _initialize_default_airspace(self):
        # 1. Waypoints
        wps = [
            Waypoint(
                id="WP_START",
                name="South Skyport (Depart)",
                position=Vector3D(x=150.0, y=100.0, z=110.0),
                is_emergency_pad=False,
                pad_available=True,
                elevation_agl=110.0,
                description="Primary civilian departure vertiport"
            ),
            Waypoint(
                id="WP_CENTRAL_CORE",
                name="Downtown Hub Core",
                position=Vector3D(x=550.0, y=280.0, z=190.0),
                is_emergency_pad=False,
                pad_available=True,
                elevation_agl=190.0,
                description="Central metropolis aerial transit interchange"
            ),
            Waypoint(
                id="WP_NORTH_SKYWAY",
                name="North Skyway Corridor",
                position=Vector3D(x=650.0, y=650.0, z=260.0),
                is_emergency_pad=False,
                pad_available=True,
                elevation_agl=260.0,
                description="High-altitude high-speed transit channel"
            ),
            Waypoint(
                id="WP_WATERFRONT_BYPASS",
                name="Waterfront Low Corridor",
                position=Vector3D(x=850.0, y=120.0, z=95.0),
                is_emergency_pad=False,
                pad_available=True,
                elevation_agl=95.0,
                description="Scenic low-altitude river transit"
            ),
            Waypoint(
                id="WP_EAST_CROSSING",
                name="East Harbor Crossing",
                position=Vector3D(x=1150.0, y=320.0, z=175.0),
                is_emergency_pad=False,
                pad_available=True,
                elevation_agl=175.0,
                description="Bridge crossing waypoint with moderate wind"
            ),
            Waypoint(
                id="WP_NORTHEAST_RIDGE",
                name="Northeast Summit Corridor",
                position=Vector3D(x=1200.0, y=700.0, z=280.0),
                is_emergency_pad=False,
                pad_available=True,
                elevation_agl=280.0,
                description="Scenic high-ridge descent waypoint"
            ),
            Waypoint(
                id="WP_DESTINATION",
                name="Neo-Pinnacle Vertiport",
                position=Vector3D(x=1650.0, y=550.0, z=310.0),
                is_emergency_pad=False,
                pad_available=True,
                elevation_agl=310.0,
                description="Main destination skyscraper rooftop vertipad"
            ),
            # Emergency Landing Vertipads
            Waypoint(
                id="PAD_EMERGENCY_NORTH",
                name="Industrial Tech Vertipad Alpha",
                position=Vector3D(x=700.0, y=850.0, z=60.0),
                is_emergency_pad=True,
                pad_available=True,
                elevation_agl=60.0,
                description="Certified emergency EVTOL pad with rapid recharge"
            ),
            Waypoint(
                id="PAD_EMERGENCY_SOUTH",
                name="Harbor Marine Vertipad Beta",
                position=Vector3D(x=950.0, y=50.0, z=45.0),
                is_emergency_pad=True,
                pad_available=True,
                elevation_agl=45.0,
                description="Coastal auxiliary landing station"
            ),
            Waypoint(
                id="PAD_EMERGENCY_EAST",
                name="Substation Roof Vertipad Gamma",
                position=Vector3D(x=1400.0, y=280.0, z=80.0),
                is_emergency_pad=True,
                pad_available=True,
                elevation_agl=80.0,
                description="Grid substation emergency landing deck"
            )
        ]
        for wp in wps:
            self.waypoints[wp.id] = wp

        # 2. Flight Corridors
        corridor_list = [
            # From START
            FlightCorridor(id="COR_START_CENTRAL", source_id="WP_START", target_id="WP_CENTRAL_CORE", nominal_altitude=190.0, speed_limit_mps=50.0, risk_level=0.10),
            FlightCorridor(id="COR_START_WATERFRONT", source_id="WP_START", target_id="WP_WATERFRONT_BYPASS", nominal_altitude=95.0, speed_limit_mps=45.0, risk_level=0.08),

            # From CENTRAL_CORE
            FlightCorridor(id="COR_CENTRAL_NORTH", source_id="WP_CENTRAL_CORE", target_id="WP_NORTH_SKYWAY", nominal_altitude=260.0, speed_limit_mps=60.0, risk_level=0.15),
            FlightCorridor(id="COR_CENTRAL_EAST", source_id="WP_CENTRAL_CORE", target_id="WP_EAST_CROSSING", nominal_altitude=180.0, speed_limit_mps=50.0, risk_level=0.20),
            FlightCorridor(id="COR_CENTRAL_EMERG_NORTH", source_id="WP_CENTRAL_CORE", target_id="PAD_EMERGENCY_NORTH", nominal_altitude=80.0, speed_limit_mps=40.0, risk_level=0.05, corridor_type="EMERGENCY_DESCENT"),

            # From NORTH_SKYWAY
            FlightCorridor(id="COR_NORTH_RIDGE", source_id="WP_NORTH_SKYWAY", target_id="WP_NORTHEAST_RIDGE", nominal_altitude=280.0, speed_limit_mps=60.0, risk_level=0.12),
            FlightCorridor(id="COR_NORTH_DEST", source_id="WP_NORTH_SKYWAY", target_id="WP_DESTINATION", nominal_altitude=310.0, speed_limit_mps=55.0, risk_level=0.25),
            FlightCorridor(id="COR_NORTH_EMERG", source_id="WP_NORTH_SKYWAY", target_id="PAD_EMERGENCY_NORTH", nominal_altitude=80.0, speed_limit_mps=38.0, risk_level=0.05, corridor_type="EMERGENCY_DESCENT"),

            # From WATERFRONT
            FlightCorridor(id="COR_WATERFRONT_EAST", source_id="WP_WATERFRONT_BYPASS", target_id="WP_EAST_CROSSING", nominal_altitude=150.0, speed_limit_mps=48.0, risk_level=0.10),
            FlightCorridor(id="COR_WATERFRONT_EMERG", source_id="WP_WATERFRONT_BYPASS", target_id="PAD_EMERGENCY_SOUTH", nominal_altitude=50.0, speed_limit_mps=35.0, risk_level=0.04, corridor_type="EMERGENCY_DESCENT"),

            # From EAST_CROSSING
            FlightCorridor(id="COR_EAST_DEST", source_id="WP_EAST_CROSSING", target_id="WP_DESTINATION", nominal_altitude=310.0, speed_limit_mps=52.0, risk_level=0.18),
            FlightCorridor(id="COR_EAST_RIDGE", source_id="WP_EAST_CROSSING", target_id="WP_NORTHEAST_RIDGE", nominal_altitude=260.0, speed_limit_mps=50.0, risk_level=0.15),
            FlightCorridor(id="COR_EAST_EMERG", source_id="WP_EAST_CROSSING", target_id="PAD_EMERGENCY_EAST", nominal_altitude=80.0, speed_limit_mps=35.0, risk_level=0.05, corridor_type="EMERGENCY_DESCENT"),

            # From NORTHEAST_RIDGE
            FlightCorridor(id="COR_RIDGE_DEST", source_id="WP_NORTHEAST_RIDGE", target_id="WP_DESTINATION", nominal_altitude=310.0, speed_limit_mps=58.0, risk_level=0.12),
            FlightCorridor(id="COR_RIDGE_EMERG", source_id="WP_NORTHEAST_RIDGE", target_id="PAD_EMERGENCY_EAST", nominal_altitude=90.0, speed_limit_mps=40.0, risk_level=0.06, corridor_type="EMERGENCY_DESCENT")
        ]
        for c in corridor_list:
            self.corridors[c.id] = c

        # 3. Restricted Airspace Zones
        self.restricted_zones["RZ_GOV_CORE"] = RestrictedZone(
            id="RZ_GOV_CORE",
            name="Civic Government Sanctuary Airspace",
            center=Vector3D(x=880.0, y=420.0, z=150.0),
            radius=180.0,
            min_altitude=0.0,
            max_altitude=350.0,
            active=False,  # Can be triggered dynamically
            severity="PROHIBITED"
        )
        self.restricted_zones["RZ_TELECOM"] = RestrictedZone(
            id="RZ_TELECOM",
            name="High-Power Microwave Array No-Fly Zone",
            center=Vector3D(x=620.0, y=450.0, z=200.0),
            radius=120.0,
            min_altitude=100.0,
            max_altitude=380.0,
            active=False,
            severity="RESTRICTED"
        )

        # 4. Weather Zones
        self.weather_zones["WZ_COASTAL_GALE"] = WeatherZone(
            id="WZ_COASTAL_GALE",
            name="Harbor Crosswind & Rain Squall",
            center=Vector3D(x=1050.0, y=250.0, z=160.0),
            radius=240.0,
            wind_speed_mps=18.0,
            wind_direction_deg=135.0,
            turbulence_factor=1.45,
            visibility_m=3500.0,
            precipitation_intensity=0.6
        )
        self.weather_zones["WZ_RIDGE_TURBULENCE"] = WeatherZone(
            id="WZ_RIDGE_TURBULENCE",
            name="Ridge Thermal Updrafts",
            center=Vector3D(x=1200.0, y=720.0, z=280.0),
            radius=190.0,
            wind_speed_mps=14.0,
            wind_direction_deg=310.0,
            turbulence_factor=1.30,
            visibility_m=7000.0,
            precipitation_intensity=0.1
        )

        # 5. Realistic 3D Buildings
        b_data = [
            ("B_SKY_TOWER_1", "Omni Central Spire", 500, 320, 240, 80, 80),
            ("B_SKY_TOWER_2", "Neo Quantum Tower", 720, 200, 180, 75, 75),
            ("B_SKY_TOWER_3", "Aero Dynamics HQ", 600, 700, 270, 90, 90),
            ("B_SKY_TOWER_4", "Cybernetics Arcology", 880, 420, 220, 110, 110),
            ("B_SKY_TOWER_5", "Vertex Center", 1100, 380, 195, 70, 70),
            ("B_SKY_TOWER_6", "Titan Ridge Spire", 1250, 680, 290, 85, 85),
            ("B_SKY_TOWER_7", "Pinnacle Horizon", 1650, 550, 310, 120, 120),
            ("B_HARBOR_1", "Maritime Control", 950, 80, 60, 90, 60),
            ("B_INDUSTRIAL_1", "Robotics Facility", 700, 850, 70, 130, 100),
            ("B_SUBSTATION_1", "Grid Substation Epsilon", 1400, 280, 85, 95, 95),
            ("B_CIVIC_1", "Metropolis Senate", 400, 180, 90, 100, 80),
            ("B_MEDIA_1", "HoloGrid Tower", 1350, 450, 210, 65, 65)
        ]
        for bid, bname, bx, by, bz, bw, bd in b_data:
            self.buildings.append(Building(
                id=bid, name=bname, x=float(bx), y=float(by), z=float(bz),
                width=float(bw), depth=float(bd)
            ))

    def check_restricted_intersection(self, p1: Vector3D, p2: Vector3D, rz: RestrictedZone) -> bool:
        """Checks if 3D segment intersects cylindrical restricted airspace."""
        if not rz.active:
            return False
        # Check altitude overlap
        seg_min_z = min(p1.z, p2.z)
        seg_max_z = max(p1.z, p2.z)
        if seg_max_z < rz.min_altitude or seg_min_z > rz.max_altitude:
            return False
        # 2D distance to cylinder center
        dist = point_segment_distance_2d(rz.center.x, rz.center.y, p1.x, p1.y, p2.x, p2.y)
        return dist < rz.radius

    def get_weather_for_corridor(self, p1: Vector3D, p2: Vector3D) -> Optional[WeatherZone]:
        """Finds most intense weather zone affecting the corridor."""
        mid_x = (p1.x + p2.x) / 2.0
        mid_y = (p1.y + p2.y) / 2.0
        for wz in self.weather_zones.values():
            dist = point_segment_distance_2d(wz.center.x, wz.center.y, p1.x, p1.y, p2.x, p2.y)
            if dist < wz.radius:
                return wz
        return None
