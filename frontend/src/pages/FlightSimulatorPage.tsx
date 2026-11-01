import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Camera,
  AlertTriangle,
  BatteryCharging,
  Gauge,
  Compass,
  Zap,
  MapPin,
  Flame,
  Radio,
  Wind,
  ShieldAlert,
  ArrowRight,
  Plus,
  Trash2
} from 'lucide-react';
import { MetropolisScene, AirspaceMapId } from '../components/MetropolisScene';
import {
  Waypoint,
  FlightCorridor,
  RestrictedZone,
  WeatherZone,
  Building,
  PlanResponse,
  DynamicEvent,
  MissionConfig
} from '../types';

interface FlightSimulatorProps {
  waypoints: Waypoint[];
  corridors: FlightCorridor[];
  restrictedZones: RestrictedZone[];
  weatherZones: WeatherZone[];
  buildings: Building[];
  activePlan: PlanResponse | null;
  config: MissionConfig;
  onDynamicReplan: (event: DynamicEvent, currentWpId: string, currentSoc: number) => Promise<any>;
  theme?: 'light' | 'dark';
}

export const FlightSimulatorPage: React.FC<FlightSimulatorProps> = ({
  waypoints,
  corridors,
  restrictedZones,
  weatherZones,
  buildings,
  activePlan,
  config,
  onDynamicReplan,
  theme = 'light'
}) => {
  // Simulator State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [simProgress, setSimProgress] = useState<number>(0.0);
  const [simSpeed, setSimSpeed] = useState<number>(1.0); // 1x, 2x, 5x
  const [cameraMode, setCameraMode] = useState<'ORBIT' | 'CHASE' | 'TOP_DOWN'>('CHASE');

  // Map Sector Selection
  const [mapSector, setMapSector] = useState<AirspaceMapId>('METROPOLIS_CORE');

  // Custom Route Builder State
  const [customRoute, setCustomRoute] = useState<string[]>(
    activePlan?.route_waypoints || ['WP_START', 'WP_CENTRAL_CORE', 'WP_NORTH_SKYWAY', 'WP_DESTINATION']
  );
  const [showRouteEditor, setShowRouteEditor] = useState<boolean>(false);

  // Failure / Crash Simulation State
  const [isCrashing, setIsCrashing] = useState<boolean>(false);
  const [crashProgress, setCrashProgress] = useState<number>(0.0); // 0.0 to 1.0 down to ground
  const [crashReason, setCrashReason] = useState<string | null>(null);

  useEffect(() => {
    if (activePlan?.route_waypoints && !customRoute.length) {
      setCustomRoute(activePlan.route_waypoints);
    }
  }, [activePlan]);

  // Main animation frame loop (handles normal flight AND freefall crash)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // When crashing, vehicle accelerates downward towards ground
      if (isCrashing) {
        setCrashProgress((prev) => {
          if (prev >= 1.0) {
            return 1.0; // Impact with ground
          }
          // Accelerated freefall gravity curve
          return Math.min(1.0, prev + dt * 0.45 * simSpeed);
        });
      } else if (isPlaying) {
        setSimProgress((prev) => {
          const increment = (dt / 25.0) * simSpeed;
          if (prev + increment >= 1.0) {
            setIsPlaying(false);
            return 1.0;
          }
          return prev + increment;
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isCrashing, simSpeed]);

  // Current interpolated Waypoint along route
  const currentWaypointIndex = Math.min(
    customRoute.length - 1,
    Math.floor(simProgress * (customRoute.length - 1))
  );
  const currentWpId = customRoute[currentWaypointIndex];
  const currentWpObj = waypoints.find((w) => w.id === currentWpId);

  // Live Metrics Calculations
  const calculatedSoc = isCrashing
    ? Math.max(0, 15 - crashProgress * 15) // Drained to 0% during crash
    : Math.max(
        activePlan?.remaining_soc_pct || 65.0,
        config.vehicle_config.initial_battery_pct -
          simProgress * (config.vehicle_config.initial_battery_pct - (activePlan?.remaining_soc_pct || 65.0))
      );

  const currentAltitude = isCrashing
    ? Math.max(0, (currentWpObj ? currentWpObj.elevation_agl : 45) * (1 - crashProgress * crashProgress))
    : currentWpObj ? currentWpObj.elevation_agl : 45;

  const currentSpeedKmh = isCrashing
    ? Math.max(0, 160 * (1 - crashProgress * 0.8))
    : isPlaying ? config.vehicle_config.cruise_speed_mps * 3.6 : 0;

  const verticalSpeedMps = isCrashing
    ? -45.0 * crashProgress // Plunging downward
    : simProgress > 0.05 && simProgress < 0.25 ? 5.2 : simProgress > 0.85 ? -4.5 : 0.0;

  const livePowerKw = isCrashing ? 0.0 : isPlaying ? (28.4 + Math.sin(simProgress * 10) * 3.2) : 1.2;

  // Trigger Failure handler
  const handleTriggerFailure = (reason: 'BATTERY_DRAINED' | 'STALL' | 'COLLISION') => {
    setIsPlaying(false);
    setIsCrashing(true);
    setCrashProgress(0);
    if (reason === 'BATTERY_DRAINED') {
      setCrashReason('CRITICAL BATTERY DRAIN: 0.0% SOC — ALL VTOL LIFT MOTORS OFFLINE');
    } else if (reason === 'STALL') {
      setCrashReason('DUAL TURBINE FLAMEOUT — COMPLETE LOSS OF VERTICAL AERODYNAMIC LIFT');
    } else {
      setCrashReason('AIRBORNE DRONE SWARM COLLISION — ROTOR CHASSIS INTEGRITY COMPROMISED');
    }
  };

  // Recover / Reset
  const handleResetFlight = () => {
    setIsCrashing(false);
    setCrashProgress(0);
    setCrashReason(null);
    setIsPlaying(false);
    setSimProgress(0);
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden select-none bg-neutral-100 dark:bg-neutral-950 font-sans">
      {/* 🔴 RED SCREEN FLASHING BLINK WHEN VEHICLE FAILS & CRASHES */}
      {isCrashing && (
        <div className="fixed inset-0 z-40 pointer-events-none animate-pulse border-8 border-red-600 bg-red-950/40 transition-opacity duration-100 flex items-center justify-center">
          <div className="p-6 rounded-2xl bg-black/90 border-2 border-red-500 shadow-2xl text-center text-white space-y-3 pointer-events-auto max-w-lg mx-4">
            <div className="flex items-center justify-center gap-2 text-red-400 font-mono text-sm font-bold tracking-widest uppercase animate-bounce">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <span>TERRAIN AHEAD! PULL UP!</span>
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>

            <h2 className="text-xl font-bold font-mono tracking-tight text-red-100">
              {crashProgress >= 1.0 ? '💥 IMPACT CONFIRMED: VEHICLE CRASH' : '⚠️ TOTAL PROPULSION FAILURE'}
            </h2>

            <p className="text-xs font-mono text-neutral-300 leading-relaxed">
              {crashReason}
            </p>

            <div className="grid grid-cols-3 gap-2 py-2 border-y border-red-900/60 font-mono text-xs">
              <div>
                <span className="text-[10px] text-red-400 block">ALTITUDE</span>
                <span className="font-bold text-red-100">{currentAltitude.toFixed(0)}m</span>
              </div>
              <div>
                <span className="text-[10px] text-red-400 block">SINK RATE</span>
                <span className="font-bold text-red-100">{verticalSpeedMps.toFixed(1)} m/s</span>
              </div>
              <div>
                <span className="text-[10px] text-red-400 block">BATTERY</span>
                <span className="font-bold text-red-100">{calculatedSoc.toFixed(1)}%</span>
              </div>
            </div>

            <button
              onClick={handleResetFlight}
              className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer"
            >
              🔄 Relaunch / Recover Flight
            </button>
          </div>
        </div>
      )}

      {/* 3D WebGL Canvas */}
      <MetropolisScene
        waypoints={waypoints}
        corridors={corridors}
        restrictedZones={restrictedZones}
        weatherZones={weatherZones}
        buildings={buildings}
        selectedRouteWpIds={customRoute}
        simProgress={simProgress}
        cameraMode={cameraMode}
        theme={theme}
        mapSector={mapSector}
        isCrashing={isCrashing}
        crashProgress={crashProgress}
      />

      {/* TOP LEFT: LIVE COCKPIT TELEMETRY HUD */}
      <div className="absolute top-4 left-4 z-20 pointer-events-auto space-y-2">
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md shadow-md w-72 space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isCrashing ? 'bg-red-500 animate-ping' : isPlaying ? 'bg-emerald-500' : 'bg-neutral-400'}`}></span>
              <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                LIVE TELEMETRY
              </span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              isCrashing ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
            }`}>
              {isCrashing ? 'FREEFALL' : isPlaying ? 'CRUISE' : 'STANDBY'}
            </span>
          </div>

          {/* Core Instruments Grid */}
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            {/* Airspeed */}
            <div className="p-2 rounded bg-neutral-50 dark:bg-neutral-800/60">
              <span className="text-[10px] text-neutral-500 block">AIRSPEED</span>
              <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {currentSpeedKmh.toFixed(0)} <span className="text-[10px] font-normal text-neutral-500">km/h</span>
              </span>
              <span className="text-[10px] text-neutral-400 block">{(currentSpeedKmh / 1.852).toFixed(0)} kts</span>
            </div>

            {/* Altitude */}
            <div className="p-2 rounded bg-neutral-50 dark:bg-neutral-800/60">
              <span className="text-[10px] text-neutral-500 block">ALTITUDE AGL</span>
              <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {currentAltitude.toFixed(0)} <span className="text-[10px] font-normal text-neutral-500">m</span>
              </span>
              <span className={`text-[10px] font-bold block ${verticalSpeedMps < -5 ? 'text-red-500' : 'text-neutral-400'}`}>
                VSI: {verticalSpeedMps >= 0 ? '+' : ''}{verticalSpeedMps.toFixed(1)} m/s
              </span>
            </div>

            {/* Battery SoC */}
            <div className="p-2 rounded bg-neutral-50 dark:bg-neutral-800/60">
              <span className="text-[10px] text-neutral-500 block">BATTERY SOC</span>
              <span className={`text-sm font-bold ${calculatedSoc <= 15 ? 'text-red-500' : 'text-neutral-900 dark:text-neutral-100'}`}>
                {calculatedSoc.toFixed(1)}%
              </span>
              <span className="text-[10px] text-neutral-400 block">Draw: {livePowerKw.toFixed(1)} kW</span>
            </div>

            {/* Waypoint Target */}
            <div className="p-2 rounded bg-neutral-50 dark:bg-neutral-800/60">
              <span className="text-[10px] text-neutral-500 block">WAYPOINT</span>
              <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate block">
                {currentWpObj ? currentWpObj.name.split(' ')[0] : 'TRANSIT'}
              </span>
              <span className="text-[10px] text-neutral-400 block">Prog: {(simProgress * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* TOP RIGHT: MAP SECTOR & CAMERA SWITCHER */}
      <div className="absolute top-4 right-4 z-20 pointer-events-auto space-y-2 flex flex-col items-end">
        {/* Map Sector Selector */}
        <div className="p-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md shadow-xs flex items-center gap-1 text-xs font-mono">
          <span className="text-[10px] text-neutral-400 px-2 font-semibold">MAP:</span>
          {[
            { id: 'METROPOLIS_CORE' as AirspaceMapId, label: 'Downtown' },
            { id: 'COASTAL_HARBOR' as AirspaceMapId, label: 'Harbor' },
            { id: 'MOUNTAIN_GORGE' as AirspaceMapId, label: 'Mountain' }
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMapSector(m.id)}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                mapSector === m.id
                  ? 'bg-black text-white dark:bg-white dark:text-black font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Camera Angles */}
        <div className="p-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md shadow-xs flex items-center gap-1 text-xs">
          <Camera className="w-3.5 h-3.5 text-neutral-400 ml-1.5" />
          {(['CHASE', 'ORBIT', 'TOP_DOWN'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setCameraMode(mode)}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                cameraMode === mode
                  ? 'bg-black text-white dark:bg-white dark:text-black font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {mode === 'CHASE' ? 'Follow' : mode === 'ORBIT' ? 'Orbit' : 'Top'}
            </button>
          ))}
        </div>

        {/* Custom Route Editor Toggle */}
        <button
          onClick={() => setShowRouteEditor(!showRouteEditor)}
          className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md shadow-xs text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:border-black dark:hover:border-white transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>{showRouteEditor ? 'Close Route Editor' : 'Custom Route Builder'}</span>
        </button>

        {/* Custom Route Editor Floating Drawer */}
        {showRouteEditor && (
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md shadow-xl w-80 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
              <span className="font-bold text-neutral-900 dark:text-neutral-100">
                Custom Waypoint Sequence
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">
                {customRoute.length} Waypoints
              </span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {customRoute.map((wpId, idx) => {
                const wp = waypoints.find((w) => w.id === wpId);
                return (
                  <div key={`${wpId}-${idx}`} className="flex items-center justify-between p-1.5 rounded bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
                    <span className="font-mono text-[11px] truncate">{idx + 1}. {wp?.name || wpId}</span>
                    {customRoute.length > 2 && (
                      <button
                        onClick={() => setCustomRoute(customRoute.filter((_, i) => i !== idx))}
                        className="text-neutral-400 hover:text-red-500 cursor-pointer ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Waypoint dropdown */}
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex gap-1">
              <select
                id="add-wp-select"
                className="flex-1 px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 text-xs bg-white dark:bg-neutral-800"
              >
                {waypoints.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  const selectEl = document.getElementById('add-wp-select') as HTMLSelectElement;
                  if (selectEl && selectEl.value) {
                    setCustomRoute([...customRoute, selectEl.value]);
                  }
                }}
                className="px-2.5 py-1 rounded bg-black text-white dark:bg-white dark:text-black font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM CENTER: FLIGHT CONTROLS & EMERGENCY INJECTORS */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-2xl px-4 pointer-events-auto space-y-2">
        {/* Emergency Failure Injectors Bar */}
        <div className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md shadow-md flex items-center justify-between gap-2 overflow-x-auto text-xs font-mono">
          <div className="flex items-center gap-1.5 text-neutral-500 text-[10px] uppercase font-bold shrink-0 ml-1">
            <Flame className="w-3.5 h-3.5 text-red-500" />
            <span>Simulate Failure:</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTriggerFailure('BATTERY_DRAINED')}
              className="px-3 py-1 rounded bg-red-100 hover:bg-red-200 dark:bg-red-950/60 dark:hover:bg-red-900 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 font-semibold cursor-pointer flex items-center gap-1"
            >
              <BatteryCharging className="w-3 h-3 text-red-500" />
              <span>Drain to 0% & Crash</span>
            </button>

            <button
              onClick={() => handleTriggerFailure('STALL')}
              className="px-3 py-1 rounded bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 font-semibold cursor-pointer flex items-center gap-1"
            >
              <Wind className="w-3 h-3" />
              <span>Engine Stall</span>
            </button>
          </div>
        </div>

        {/* Primary Playback Bar */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md shadow-xl space-y-3">
          {/* Progress Slider */}
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="1"
              step="0.005"
              value={simProgress}
              disabled={isCrashing}
              onChange={(e) => setSimProgress(parseFloat(e.target.value))}
              className="w-full accent-black dark:accent-white cursor-pointer h-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-700 disabled:opacity-40"
            />
            <span className="font-mono text-xs font-semibold text-neutral-700 dark:text-neutral-300 w-12 text-right">
              {(simProgress * 100).toFixed(0)}%
            </span>
          </div>

          {/* Buttons & Speed Multiplier */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (isCrashing) handleResetFlight();
                  setIsPlaying(!isPlaying);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isPlaying ? 'Pause Flight' : 'Play Flight'}</span>
              </button>

              <button
                onClick={handleResetFlight}
                className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                title="Reset to origin"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Speed Multiplier */}
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-md border border-neutral-200 dark:border-neutral-800 text-xs">
              {[1.0, 2.0, 5.0].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setSimSpeed(speed)}
                  className={`px-2.5 py-1 rounded font-mono text-[11px] transition-colors cursor-pointer ${
                    simSpeed === speed
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-semibold shadow-2xs'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
