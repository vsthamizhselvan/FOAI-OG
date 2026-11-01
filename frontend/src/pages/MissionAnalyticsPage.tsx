import React from 'react';
import {
  BarChart3,
  Zap,
  TrendingUp,
  Activity,
  Shield,
  Clock,
  Navigation
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { PlanResponse, MissionConfig } from '../types';

interface MissionAnalyticsProps {
  activePlan: PlanResponse | null;
  config: MissionConfig;
}

export const MissionAnalyticsPage: React.FC<MissionAnalyticsProps> = ({
  activePlan,
  config
}) => {
  if (!activePlan || !activePlan.route_legs || activePlan.route_legs.length === 0) {
    return (
      <div className="p-12 text-center font-mono text-gray-500">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <h3 className="text-base font-bold text-gray-300">NO ACTIVE MISSION TELEMETRY</h3>
        <p className="text-xs mt-1">Execute an AO* mission plan from Mission Control to populate analytical profiles.</p>
      </div>
    );
  }

  // Construct distance and time profile series
  let runningDistKm = 0;
  let runningTimeS = 0;
  let runningSoc = activePlan.initial_soc_pct;

  const profileData = [
    {
      waypoint: activePlan.route_waypoints[0]?.replace('WP_', '') || 'START',
      distanceKm: 0,
      timeS: 0,
      soc: runningSoc,
      altitudeM: activePlan.route_legs[0]?.from_pos?.z || 110,
      speedKmh: activePlan.route_legs[0]?.telemetry?.effective_speed_kmh || 160,
      powerKw: activePlan.route_legs[0]?.telemetry?.average_power_kw || 24,
      risk: 0.1
    }
  ];

  activePlan.route_legs.forEach((leg, i) => {
    runningDistKm += leg.telemetry.distance_m / 1000;
    runningTimeS += leg.telemetry.duration_s;
    runningSoc -= leg.telemetry.battery_pct_cost;

    profileData.push({
      waypoint: leg.to_name.split(' ')[0],
      distanceKm: parseFloat(runningDistKm.toFixed(2)),
      timeS: parseFloat(runningTimeS.toFixed(1)),
      soc: parseFloat(Math.max(0, runningSoc).toFixed(1)),
      altitudeM: leg.to_pos.z,
      speedKmh: leg.telemetry.effective_speed_kmh,
      powerKw: leg.telemetry.average_power_kw,
      risk: leg.telemetry.average_power_kw > 35 ? 0.35 : 0.15
    });
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between border-b border-[#1e2433] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h1 className="text-lg font-mono font-bold text-white tracking-wider">
              MISSION TELEMETRY & PHYSICAL PROFILE ANALYTICS
            </h1>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Empirical kinematic profiles and energy expenditure computed along the chosen AO* trajectory.
          </p>
        </div>
      </div>

      {/* Primary 4 Metric Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
        <div className="hud-panel p-4 rounded-xl border border-[#1e2433]">
          <span className="text-gray-400 text-[10px] block">TOTAL NET ENERGY</span>
          <span className="text-xl font-bold text-white mt-1 block">
            {activePlan.total_energy_kwh.toFixed(2)} kWh
          </span>
          <span className="text-[11px] text-cyan-400">
            {((activePlan.total_energy_kwh / config.vehicle_config.battery_capacity_kwh) * 100).toFixed(1)}% of Pack Capacity
          </span>
        </div>

        <div className="hud-panel p-4 rounded-xl border border-[#1e2433]">
          <span className="text-gray-400 text-[10px] block">FINAL BATTERY RESERVE</span>
          <span className="text-xl font-bold text-cyan-400 mt-1 block">
            {activePlan.remaining_soc_pct.toFixed(1)}% SoC
          </span>
          <span className="text-[11px] text-emerald-400">
            +{(activePlan.remaining_soc_pct - activePlan.emergency_reserve_pct).toFixed(1)}% above reserve floor
          </span>
        </div>

        <div className="hud-panel p-4 rounded-xl border border-[#1e2433]">
          <span className="text-gray-400 text-[10px] block">TOTAL DISTANCE / TIME</span>
          <span className="text-xl font-bold text-white mt-1 block">
            {(activePlan.total_distance_m / 1000).toFixed(2)} km
          </span>
          <span className="text-[11px] text-gray-400">
            {activePlan.total_time_s.toFixed(1)}s Simulated Transit
          </span>
        </div>

        <div className="hud-panel p-4 rounded-xl border border-[#1e2433]">
          <span className="text-gray-400 text-[10px] block">CORRIDOR LEGS</span>
          <span className="text-xl font-bold text-white mt-1 block">
            {activePlan.route_legs.length} Interchanges
          </span>
          <span className="text-[11px] text-gray-400">
            Terminating at {activePlan.terminal_landing_site.split(' ')[0]}
          </span>
        </div>
      </div>

      {/* Telemetry Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Battery Discharge Profile over Distance */}
        <div className="hud-panel p-5 rounded-xl border border-[#1e2433] space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-white font-bold flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-cyan-400" />
              BATTERY STATE OF CHARGE (SoC %) VS DISTANCE
            </span>
            <span className="text-gray-400">Reserve Floor: {config.vehicle_config.emergency_reserve_pct}%</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={profileData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="socGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00e5ff" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" />
                <XAxis dataKey="waypoint" stroke="#64748b" fontSize={10} fontFamily="monospace" />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} fontFamily="monospace" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b0e14', borderColor: '#1e2433', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Area type="monotone" dataKey="soc" stroke="#00e5ff" strokeWidth={2} fillOpacity={1} fill="url(#socGradient)" name="SoC %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Flight Altitude Profile */}
        <div className="hud-panel p-5 rounded-xl border border-[#1e2433] space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-white font-bold flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              FLIGHT ALTITUDE PROFILE (AGL METERS)
            </span>
            <span className="text-gray-400">Vertical Climb & Glide</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={profileData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="altGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" />
                <XAxis dataKey="waypoint" stroke="#64748b" fontSize={10} fontFamily="monospace" />
                <YAxis domain={[0, 350]} stroke="#64748b" fontSize={10} fontFamily="monospace" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b0e14', borderColor: '#1e2433', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Area type="monotone" dataKey="altitudeM" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#altGradient)" name="Altitude (m)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Power Draw Profile (kW) */}
        <div className="hud-panel p-5 rounded-xl border border-[#1e2433] space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-white font-bold flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-400" />
              AVERAGE POWER CONSUMPTION (kW)
            </span>
            <span className="text-gray-400">Hover, Drag & Climb</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profileData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" />
                <XAxis dataKey="waypoint" stroke="#64748b" fontSize={10} fontFamily="monospace" />
                <YAxis stroke="#64748b" fontSize={10} fontFamily="monospace" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b0e14', borderColor: '#1e2433', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Bar dataKey="powerKw" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Power (kW)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Effective Cruise Speed Profile (km/h) */}
        <div className="hud-panel p-5 rounded-xl border border-[#1e2433] space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-white font-bold flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-purple-400" />
              EFFECTIVE CRUISE VELOCITY (km/h)
            </span>
            <span className="text-gray-400">Speed Limit Adherence</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={profileData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" />
                <XAxis dataKey="waypoint" stroke="#64748b" fontSize={10} fontFamily="monospace" />
                <YAxis stroke="#64748b" fontSize={10} fontFamily="monospace" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b0e14', borderColor: '#1e2433', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Line type="stepAfter" dataKey="speedKmh" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} name="Airspeed (km/h)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
