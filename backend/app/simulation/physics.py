"""
Kinematic and Aerodynamic Power Model for Simulated Aero Roadster
"""

import math
from typing import Dict, Any, Tuple, Optional
from app.models.mission import Vector3D, VehicleConfig, WeatherZone

AIR_DENSITY = 1.225  # kg/m^3 at sea level
GRAVITY = 9.80665  # m/s^2


class VehiclePhysics:
    @staticmethod
    def distance_3d(p1: Vector3D, p2: Vector3D) -> float:
        return math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2 + (p2.z - p1.z) ** 2)

    @staticmethod
    def calculate_segment_telemetry(
        p1: Vector3D,
        p2: Vector3D,
        vehicle: VehicleConfig,
        nominal_speed_mps: float,
        weather: Optional[WeatherZone] = None,
        headwind_penalty: float = 0.0
    ) -> Dict[str, Any]:
        """
        Computes accurate simulated flight kinematics and energy consumption.
        """
        dist_m = VehiclePhysics.distance_3d(p1, p2)
        dz_m = p2.z - p1.z
        dx_m = p2.x - p1.x
        dy_m = p2.y - p1.y

        # Speed clamping
        speed_mps = min(nominal_speed_mps, vehicle.max_speed_mps)
        if dz_m > 0:
            # Climbing requires lower horizontal speed
            climb_time = dz_m / vehicle.climb_rate_mps
            horiz_dist = math.sqrt(dx_m ** 2 + dy_m ** 2)
            horiz_time = horiz_dist / speed_mps if speed_mps > 0 else 1.0
            duration_s = max(climb_time, horiz_time)
            effective_speed = dist_m / duration_s if duration_s > 0 else speed_mps
        elif dz_m < 0:
            descent_time = abs(dz_m) / vehicle.descent_rate_mps
            horiz_dist = math.sqrt(dx_m ** 2 + dy_m ** 2)
            horiz_time = horiz_dist / speed_mps if speed_mps > 0 else 1.0
            duration_s = max(descent_time, horiz_time)
            effective_speed = dist_m / duration_s if duration_s > 0 else speed_mps
        else:
            duration_s = dist_m / speed_mps if speed_mps > 0 else 1.0
            effective_speed = speed_mps

        # Aerodynamic drag power: 0.5 * rho * Cd * A * v^3
        v_air = effective_speed + headwind_penalty
        p_drag_w = 0.5 * AIR_DENSITY * vehicle.drag_coefficient * vehicle.frontal_area_m2 * (v_air ** 3)

        # Baseline lift & active aero stabilizer power (approx 18 kW for roadster mass in cruise aero-assist)
        p_lift_w = 18000.0

        # Potential energy change rate: m * g * dz / dt
        if dz_m > 0:
            p_climb_w = (vehicle.empty_mass_kg * GRAVITY * dz_m) / duration_s
        else:
            # Regen capture during descent (efficiency 28%)
            p_climb_w = 0.28 * (vehicle.empty_mass_kg * GRAVITY * dz_m) / duration_s

        # Turbulence penalty
        turb_factor = weather.turbulence_factor if weather else 1.0

        # Total electric power draw (Watts)
        p_total_w = (p_drag_w + p_lift_w + max(p_climb_w, -12000.0)) * turb_factor + (vehicle.auxiliary_power_kw * 1000.0)
        p_total_kw = max(5.0, p_total_w / 1000.0)

        # Energy consumption in kWh: (kW * s) / 3600
        energy_kwh = (p_total_kw * duration_s) / 3600.0

        # Equivalent battery percentage
        battery_pct_cost = (energy_kwh / vehicle.battery_capacity_kwh) * 100.0

        return {
            "distance_m": round(dist_m, 1),
            "duration_s": round(duration_s, 2),
            "effective_speed_mps": round(effective_speed, 1),
            "effective_speed_kmh": round(effective_speed * 3.6, 1),
            "average_power_kw": round(p_total_kw, 2),
            "energy_consumed_kwh": round(energy_kwh, 3),
            "battery_pct_cost": round(battery_pct_cost, 2),
            "climb_descent_m": round(dz_m, 1)
        }
