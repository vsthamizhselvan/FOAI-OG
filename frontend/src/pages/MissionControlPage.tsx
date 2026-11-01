import React, { useState } from 'react';
import {
  Navigation,
  Play,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BatteryCharging,
  Clock,
  Gauge,
  Sliders,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  Box
} from 'lucide-react';
import { MissionConfig, PlanResponse, DemoMission, Waypoint } from '../types';

interface MissionControlProps {
  config: MissionConfig;
  onUpdateConfig: (newConfig: MissionConfig) => void;
  activePlan: PlanResponse | null;
  loading: boolean;
  onRunPlanner: () => void;
  demoMissions: DemoMission[];
  onSelectDemo: (demo: DemoMission) => void;
  waypoints: Waypoint[];
  onSwitchToSim: () => void;
}

export const MissionControlPage: React.FC<MissionControlProps> = ({
  config,
  onUpdateConfig,
  activePlan,
  loading,
  onRunPlanner,
  demoMissions,
  onSelectDemo,
  waypoints,
  onSwitchToSim
}) => {
  const [activePreset, setActivePreset] = useState<string>('DEMO_1_NORMAL');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Friendly waypoint labels
  const getWaypointName = (id: string) => {
    const wp = waypoints.find((w) => w.id === id);
    return wp ? wp.name : id;
  };

  const isSafe = activePlan ? activePlan.success && activePlan.safety_audit?.is_safe : true;
  const isEmergency = activePlan?.is_emergency_landing;
  const remainingSoc = activePlan?.remaining_soc_pct ?? config.vehicle_config.initial_battery_pct;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      {/* 1. Header & Quick Scenarios */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Autonomous Flight Planner
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Simulate and calculate collision-free, energy-verified flight paths using AO* heuristic search.
          </p>
        </div>

        {/* Quick Scenario Preset Chips */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block mb-2">
            Select a Scenario Preset:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {demoMissions.slice(0, 4).map((demo) => {
              const isSelected = activePreset === demo.id;
              return (
                <button
                  key={demo.id}
                  onClick={() => {
                    setActivePreset(demo.id);
                    onSelectDemo(demo);
                  }}
                  className={`text-left p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white shadow-xs'
                      : 'bg-white text-neutral-800 border-neutral-200 hover:border-neutral-400 dark:bg-neutral-900 dark:text-neutral-200 dark:border-neutral-800 dark:hover:border-neutral-600'
                  }`}
                >
                  <div className="flex items-center justify-between font-medium text-xs">
                    <span>{demo.name.split(':')[0]}</span>
                    {isSelected && <Sparkles className="w-3.5 h-3.5 shrink-0" />}
                  </div>
                  <p
                    className={`text-[11px] mt-1 line-clamp-2 ${
                      isSelected ? 'text-neutral-300 dark:text-neutral-600' : 'text-neutral-500 dark:text-neutral-400'
                    }`}
                  >
                    {demo.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Simple Planning Form */}
      <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Origin */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
              Origin Vertipad
            </label>
            <select
              value={config.start_waypoint_id}
              onChange={(e) => onUpdateConfig({ ...config, start_waypoint_id: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
            >
              {waypoints.filter((w) => !w.is_emergency_pad).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Destination */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
              Destination Vertipad
            </label>
            <select
              value={config.destination_waypoint_id}
              onChange={(e) => onUpdateConfig({ ...config, destination_waypoint_id: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
            >
              {waypoints.filter((w) => !w.is_emergency_pad).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Flight Priority */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
              Optimization Priority
            </label>
            <select
              value={config.priority}
              onChange={(e) => onUpdateConfig({ ...config, priority: e.target.value as any })}
              className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
            >
              <option value="BALANCED">Balanced (Energy & Time)</option>
              <option value="SAFEST">Safest (Maximum Clearance)</option>
              <option value="LOWEST_ENERGY">Lowest Energy (Minimal Drag)</option>
              <option value="SHORTEST_TIME">Shortest Time (High Speed)</option>
            </select>
          </div>
        </div>

        {/* Collapsible Advanced Parameters */}
        <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Advanced Aircraft Parameters</span>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAdvanced && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 text-xs">
              <div>
                <label className="text-neutral-600 dark:text-neutral-400 block mb-1">
                  Initial Battery SoC: {config.vehicle_config.initial_battery_pct}%
                </label>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={config.vehicle_config.initial_battery_pct}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...config,
                      vehicle_config: {
                        ...config.vehicle_config,
                        initial_battery_pct: parseFloat(e.target.value)
                      }
                    })
                  }
                  className="w-full accent-black dark:accent-white cursor-pointer"
                />
              </div>

              <div>
                <label className="text-neutral-600 dark:text-neutral-400 block mb-1">
                  Reserve Floor: {config.vehicle_config.emergency_reserve_pct}%
                </label>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={config.vehicle_config.emergency_reserve_pct}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...config,
                      vehicle_config: {
                        ...config.vehicle_config,
                        emergency_reserve_pct: parseFloat(e.target.value)
                      }
                    })
                  }
                  className="w-full accent-black dark:accent-white cursor-pointer"
                />
              </div>

              <div>
                <label className="text-neutral-600 dark:text-neutral-400 block mb-1">
                  Cruise Speed: {config.vehicle_config.cruise_speed_mps} m/s ({(config.vehicle_config.cruise_speed_mps * 3.6).toFixed(0)} km/h)
                </label>
                <input
                  type="range"
                  min="20"
                  max="70"
                  value={config.vehicle_config.cruise_speed_mps}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...config,
                      vehicle_config: {
                        ...config.vehicle_config,
                        cruise_speed_mps: parseFloat(e.target.value)
                      }
                    })
                  }
                  className="w-full accent-black dark:accent-white cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onRunPlanner}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-black text-white dark:bg-white dark:text-black font-semibold text-sm hover:opacity-90 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{loading ? 'Evaluating AO* Graph...' : 'Calculate Optimal Flight Route'}</span>
          </button>
        </div>
      </div>

      {/* 3. Planning Results Panel */}
      {activePlan && (
        <div className="space-y-6">
          {/* Main Status & Causal Summary */}
          <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                {isSafe && !isEmergency ? (
                  <div className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                ) : (
                  <div className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100">
                    <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                )}
                <div>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    {isEmergency
                      ? 'Diverted to Certified Emergency Vertipad'
                      : isSafe
                      ? 'Optimal Flight Plan Cleared'
                      : 'Route Constraint Caution'}
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Terminal Destination: <span className="font-semibold text-neutral-900 dark:text-neutral-100">{getWaypointName(activePlan.terminal_landing_site)}</span>
                  </p>
                </div>
              </div>

              {/* Jump to 3D View Button */}
              <button
                onClick={onSwitchToSim}
                className="flex items-center gap-2 px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                <Box className="w-3.5 h-3.5" />
                <span>View 3D Airspace Simulation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Plain-English AI Explanation */}
            <div className="mt-4 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-700 dark:text-neutral-300">
              <span className="font-semibold text-neutral-900 dark:text-neutral-100 block mb-1">
                AI Decision Rationale:
              </span>
              <p className="leading-relaxed">
                {activePlan.explanation?.summary ||
                  'The AO* engine expanded the AND-OR hypergraph, verified simultaneous corridor clearances, and converged on the optimal cost path.'}
              </p>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-xs font-medium mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Estimated Time</span>
              </div>
              <div className="text-xl font-bold font-mono text-neutral-900 dark:text-neutral-100">
                {(activePlan.total_time_s / 60).toFixed(1)} min
              </div>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {activePlan.total_time_s.toFixed(0)} seconds
              </span>
            </div>

            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-xs font-medium mb-1">
                <BatteryCharging className="w-3.5 h-3.5" />
                <span>Battery Remaining</span>
              </div>
              <div className="text-xl font-bold font-mono text-neutral-900 dark:text-neutral-100">
                {activePlan.remaining_soc_pct.toFixed(1)}%
              </div>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Floor: &ge;{activePlan.emergency_reserve_pct}%
              </span>
            </div>

            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-xs font-medium mb-1">
                <Gauge className="w-3.5 h-3.5" />
                <span>Distance</span>
              </div>
              <div className="text-xl font-bold font-mono text-neutral-900 dark:text-neutral-100">
                {(activePlan.total_distance_m / 1000).toFixed(2)} km
              </div>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {activePlan.total_distance_m.toFixed(0)} meters
              </span>
            </div>

            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-xs font-medium mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Energy Drawn</span>
              </div>
              <div className="text-xl font-bold font-mono text-neutral-900 dark:text-neutral-100">
                {activePlan.total_energy_kwh.toFixed(1)} kWh
              </div>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Cost: {activePlan.solution_cost.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Step-by-Step Waypoint Route */}
          <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              Flight Route Sequence ({activePlan.route_waypoints.length} Waypoints)
            </h3>

            <div className="space-y-3">
              {activePlan.route_waypoints.map((wpId, idx) => {
                const wp = waypoints.find((w) => w.id === wpId);
                const isStart = idx === 0;
                const isEnd = idx === activePlan.route_waypoints.length - 1;
                const leg = activePlan.route_legs[idx - 1];

                return (
                  <div key={`${wpId}-${idx}`} className="flex items-start gap-4">
                    {/* Step Indicator */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          isStart || isEnd
                            ? 'bg-black text-white dark:bg-white dark:text-black'
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {idx + 1}
                      </div>
                      {!isEnd && (
                        <div className="w-0.5 h-8 bg-neutral-200 dark:border-neutral-800 my-1"></div>
                      )}
                    </div>

                    {/* Step Details */}
                    <div className="flex-1 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                          {wp?.name || wpId}
                        </span>
                        <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                          Alt: {wp?.elevation_agl || 40}m AGL
                        </span>
                      </div>
                      {leg && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                          Leg: {(leg.telemetry.distance_m / 1000).toFixed(2)} km &bull;{' '}
                          {(leg.telemetry.effective_speed_mps * 3.6).toFixed(0)} km/h &bull;{' '}
                          {leg.telemetry.energy_consumed_kwh.toFixed(2)} kWh
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
