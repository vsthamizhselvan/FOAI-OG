import React, { useState, useEffect } from 'react';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  BatteryCharging,
  Gauge,
  Sparkles,
  Send,
  Bot,
  Box
} from 'lucide-react';
import { Navbar, NavTab } from './components/Navbar';
import { FlightSimulatorPage } from './pages/FlightSimulatorPage';
import { CounterfactualLabPage } from './pages/CounterfactualLabPage';
import { HowToUsePage } from './pages/HowToUsePage';
import { ApiService, EnvironmentData } from './services/api';
import { MissionConfig, PlanResponse, CounterfactualResponse, DynamicEvent } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('planner');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [loading, setLoading] = useState<boolean>(false);
  const [environment, setEnvironment] = useState<EnvironmentData | null>(null);
  const [cfData, setCfData] = useState<CounterfactualResponse | null>(null);

  // Manual Input State
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [manualBattery, setManualBattery] = useState<number>(85);
  const [manualSpeedKmh, setManualSpeedKmh] = useState<number>(160);
  const [manualPriority, setManualPriority] = useState<MissionConfig['priority']>('BALANCED');
  const [startWp, setStartWp] = useState<string>('WP_START');
  const [destWp, setDestWp] = useState<string>('WP_DESTINATION');
  const [inputMode, setInputMode] = useState<'prompt' | 'fields'>('prompt');

  // AI Response Analysis Note
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  // Active mission config
  const [config, setConfig] = useState<MissionConfig>({
    mission_id: 'MISSION_ACTIVE_01',
    name: 'Metropolis Aero Corridor Transit',
    start_waypoint_id: 'WP_START',
    destination_waypoint_id: 'WP_DESTINATION',
    vehicle_config: {
      model_name: 'Tesla Roadster Aero (EVTOL)',
      battery_capacity_kwh: 100.0,
      initial_battery_pct: 85.0,
      emergency_reserve_pct: 15.0,
      max_speed_mps: 60.0,
      cruise_speed_mps: 45.0,
      climb_rate_mps: 8.0,
      descent_rate_mps: 6.0,
      empty_mass_kg: 1850.0,
      drag_coefficient: 0.22,
      frontal_area_m2: 2.1,
      auxiliary_power_kw: 1.2
    },
    priority: 'BALANCED',
    risk_tolerance: 0.2,
    distance_vs_energy_weight: 0.5,
    seed: 42
  });

  const [activePlan, setActivePlan] = useState<PlanResponse | null>(null);

  // Sync theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const envData = await ApiService.getEnvironment();
        setEnvironment(envData);
        const plan = await ApiService.planMission(config);
        setActivePlan(plan);
        setAiAnalysis(
          'AI initialized nominal route to Neo-Pinnacle Vertiport. AO* verified high-speed skyway clearance and 15% reserve buffer.'
        );
        ApiService.getCounterfactuals(config).then(setCfData).catch(console.error);
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Run planner with config
  const executePlan = async (targetConfig: MissionConfig, analysisText?: string) => {
    try {
      setLoading(true);
      const plan = await ApiService.planMission(targetConfig);
      setActivePlan(plan);
      setConfig(targetConfig);
      if (analysisText) {
        setAiAnalysis(analysisText);
      } else {
        setAiAnalysis(
          plan.is_emergency_landing
            ? `AI safety trigger: Available battery (${targetConfig.vehicle_config.initial_battery_pct}%) is insufficient for destination without breaching the 15% safety floor. AO* autonomously diverted flight to nearest emergency vertipad.`
            : `AI optimization successful: Evaluated ${plan.explanation.expanded_nodes} hyperarcs using AO* search. Selected Pareto-optimal corridor satisfying all airspace safety constraints.`
        );
      }
      ApiService.getCounterfactuals(targetConfig).then(setCfData).catch(console.error);
    } catch (err) {
      console.error('Planning failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Process Natural Language Input
  const handlePromptSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userPrompt.trim()) return;

    const query = userPrompt.toLowerCase();
    let newBattery = manualBattery;
    let newPriority: MissionConfig['priority'] = 'BALANCED';
    let newSpeedMps = manualSpeedKmh / 3.6;

    // Detect battery numbers
    const numMatch = query.match(/(\d+)\s*%/);
    if (numMatch) {
      newBattery = Math.min(100, Math.max(15, parseInt(numMatch[1], 10)));
      setManualBattery(newBattery);
    } else if (query.includes('low battery') || query.includes('emergency')) {
      newBattery = 32;
      setManualBattery(32);
    } else if (query.includes('full battery') || query.includes('100')) {
      newBattery = 95;
      setManualBattery(95);
    }

    // Detect priority intent
    if (query.includes('safe') || query.includes('clearance') || query.includes('avoid')) {
      newPriority = 'SAFEST';
      setManualPriority('SAFEST');
    } else if (query.includes('fast') || query.includes('quick') || query.includes('speed')) {
      newPriority = 'SHORTEST_TIME';
      setManualPriority('SHORTEST_TIME');
      newSpeedMps = 55.0;
    } else if (query.includes('eco') || query.includes('energy') || query.includes('save')) {
      newPriority = 'LOWEST_ENERGY';
      setManualPriority('LOWEST_ENERGY');
    }

    const updatedConfig: MissionConfig = {
      ...config,
      start_waypoint_id: startWp,
      destination_waypoint_id: destWp,
      priority: newPriority,
      vehicle_config: {
        ...config.vehicle_config,
        initial_battery_pct: newBattery,
        cruise_speed_mps: newSpeedMps
      }
    };

    const aiExplanation = `AI interpreted request: "${userPrompt}". Configured battery to ${newBattery}%, priority to ${newPriority}, and resolved optimal corridor via AO* AND-OR graph search.`;
    executePlan(updatedConfig, aiExplanation);
  };

  // 2. Process Manual Numbers & Field Inputs
  const handleManualFieldsSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const updatedConfig: MissionConfig = {
      ...config,
      start_waypoint_id: startWp,
      destination_waypoint_id: destWp,
      priority: manualPriority,
      vehicle_config: {
        ...config.vehicle_config,
        initial_battery_pct: manualBattery,
        cruise_speed_mps: manualSpeedKmh / 3.6
      }
    };

    const aiExplanation = `AI evaluated your manual inputs: Origin: ${startWp}, Destination: ${destWp}, Battery: ${manualBattery}%, Speed: ${manualSpeedKmh} km/h, Priority: ${manualPriority}. Solved via AO* hyperarc propagation.`;
    executePlan(updatedConfig, aiExplanation);
  };

  // Dynamic In-Flight Disturbance Replan Handler
  const handleDynamicReplan = async (
    event: DynamicEvent,
    currentWpId: string,
    currentSoc: number
  ) => {
    if (!activePlan) return null;
    const result = await ApiService.replanMission({
      config,
      current_waypoint_id: currentWpId,
      current_soc_pct: currentSoc,
      event,
      original_route: activePlan.route_waypoints
    });
    return result;
  };

  const waypoints = environment?.waypoints || [];
  const corridors = environment?.corridors || [];
  const restrictedZones = environment?.restricted_zones || [];
  const weatherZones = environment?.weather_zones || [];
  const buildings = environment?.buildings || [];

  const getWpName = (id: string) => {
    const w = waypoints.find((wp) => wp.id === id);
    return w ? w.name : id;
  };

  const isDiverted = activePlan?.is_emergency_landing;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors duration-200 flex flex-col">
      {/* 1. Header with Page Tabs */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activePlan={activePlan}
        batteryPct={config.vehicle_config.initial_battery_pct}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      />

      {/* Main Content by Page Tab */}
      <main className="flex-1 overflow-y-auto">
        {/* PAGE 1: FLIGHT PLANNER (Manual Input + AI Result) */}
        {activeTab === 'planner' && (
          <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
            {/* Manual Input Box */}
            <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <div>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    <span>Give Manual Input to AI</span>
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Type instructions or enter custom flight values, then let the AI plan the route.
                  </p>
                </div>

                {/* Input Mode Toggle */}
                <div className="flex items-center gap-1 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 text-xs font-medium">
                  <button
                    onClick={() => setInputMode('prompt')}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                      inputMode === 'prompt'
                        ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Text Prompt
                  </button>
                  <button
                    onClick={() => setInputMode('fields')}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                      inputMode === 'fields'
                        ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Custom Numbers
                  </button>
                </div>
              </div>

              {/* Mode A: Natural Language Prompt Input */}
              {inputMode === 'prompt' && (
                <form onSubmit={handlePromptSubmit} className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      placeholder="e.g. 'Fly with 30% battery and land safely' or 'Fastest route to Neo-Pinnacle'..."
                      className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                    />
                    <button
                      type="submit"
                      disabled={loading || !userPrompt.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-black text-white dark:bg-white dark:text-black font-semibold text-sm hover:opacity-90 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Run AI</span>
                    </button>
                  </div>

                  {/* Quick Example Chips */}
                  <div>
                    <span className="text-[11px] font-semibold text-neutral-400 block mb-1.5 uppercase tracking-wider">
                      Or click an example:
                    </span>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {[
                        'Emergency flight with 32% battery',
                        'Safest path with high terrain clearance',
                        'High speed transit at maximum cruise',
                        'Eco flight with 90% battery'
                      ].map((example) => (
                        <button
                          type="button"
                          key={example}
                          onClick={() => {
                            setUserPrompt(example);
                            const query = example.toLowerCase();
                            let bat = 85;
                            let pri: MissionConfig['priority'] = 'BALANCED';
                            if (query.includes('32%')) bat = 32;
                            if (query.includes('90%')) bat = 90;
                            if (query.includes('safest')) pri = 'SAFEST';
                            if (query.includes('high speed')) pri = 'SHORTEST_TIME';
                            if (query.includes('eco')) pri = 'LOWEST_ENERGY';

                            setManualBattery(bat);
                            setManualPriority(pri);
                            const cfg: MissionConfig = {
                              ...config,
                              priority: pri,
                              vehicle_config: { ...config.vehicle_config, initial_battery_pct: bat }
                            };
                            executePlan(cfg, `AI evaluated prompt: "${example}".`);
                          }}
                          className="px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300 hover:border-black dark:hover:border-white transition-colors cursor-pointer"
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  </div>
                </form>
              )}

              {/* Mode B: Manual Number Fields */}
              {inputMode === 'fields' && (
                <form onSubmit={handleManualFieldsSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <label className="font-semibold text-neutral-600 dark:text-neutral-400 block mb-1">
                        Battery Level (%)
                      </label>
                      <input
                        type="number"
                        min="15"
                        max="100"
                        value={manualBattery}
                        onChange={(e) => setManualBattery(parseFloat(e.target.value) || 15)}
                        className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono text-sm text-neutral-900 dark:text-neutral-100"
                      />
                      <span className="text-[10px] text-neutral-400 mt-1 block">Try 32% for emergency divert</span>
                    </div>

                    <div>
                      <label className="font-semibold text-neutral-600 dark:text-neutral-400 block mb-1">
                        Speed (km/h)
                      </label>
                      <input
                        type="number"
                        min="60"
                        max="220"
                        value={manualSpeedKmh}
                        onChange={(e) => setManualSpeedKmh(parseFloat(e.target.value) || 100)}
                        className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono text-sm text-neutral-900 dark:text-neutral-100"
                      />
                      <span className="text-[10px] text-neutral-400 mt-1 block">{(manualSpeedKmh / 3.6).toFixed(0)} m/s</span>
                    </div>

                    <div>
                      <label className="font-semibold text-neutral-600 dark:text-neutral-400 block mb-1">
                        From (Start)
                      </label>
                      <select
                        value={startWp}
                        onChange={(e) => setStartWp(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-neutral-100"
                      >
                        {waypoints.filter((w) => !w.is_emergency_pad).map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-neutral-600 dark:text-neutral-400 block mb-1">
                        To (Destination)
                      </label>
                      <select
                        value={destWp}
                        onChange={(e) => setDestWp(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-neutral-100"
                      >
                        {waypoints.filter((w) => !w.is_emergency_pad).map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-neutral-500">Goal:</span>
                      {(['BALANCED', 'SAFEST', 'LOWEST_ENERGY', 'SHORTEST_TIME'] as const).map((pri) => (
                        <button
                          type="button"
                          key={pri}
                          onClick={() => setManualPriority(pri)}
                          className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                            manualPriority === pri
                              ? 'bg-black text-white dark:bg-white dark:text-black font-semibold'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200'
                          }`}
                        >
                          {pri === 'BALANCED' ? 'Balanced' : pri === 'SAFEST' ? 'Safest' : pri === 'LOWEST_ENERGY' ? 'Lowest Energy' : 'Fastest'}
                        </button>
                      ))}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black font-semibold text-xs hover:opacity-90 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{loading ? 'Evaluating...' : 'Run AI With Custom Inputs'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* The Result from AI */}
            {activePlan && (
              <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-6">
                <div className="flex items-start sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800">
                      {isDiverted ? (
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                        {isDiverted ? 'AI Action: Emergency Vertipad Diversion' : 'AI Result: Optimal Route Cleared'}
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Final Landing Pad: <strong className="text-neutral-900 dark:text-neutral-100">{getWpName(activePlan.terminal_landing_site)}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Switch to 3D View Button */}
                  <button
                    onClick={() => setActiveTab('simulator')}
                    className="flex items-center gap-2 px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>Watch in 3D Airspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* AI Reasoning Response Box */}
                {aiAnalysis && (
                  <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-700 dark:text-neutral-300 space-y-1">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Decision Rationale:
                    </span>
                    <p className="leading-relaxed">{aiAnalysis}</p>
                  </div>
                )}

                {/* 3 Metric Summary Boxes */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                    <div className="flex items-center justify-center gap-1 text-xs text-neutral-500 mb-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Flight Duration</span>
                    </div>
                    <span className="text-lg font-bold font-mono text-neutral-900 dark:text-neutral-100">
                      {(activePlan.total_time_s / 60).toFixed(1)} min
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                    <div className="flex items-center justify-center gap-1 text-xs text-neutral-500 mb-1">
                      <BatteryCharging className="w-3.5 h-3.5" />
                      <span>Remaining SoC</span>
                    </div>
                    <span className="text-lg font-bold font-mono text-neutral-900 dark:text-neutral-100">
                      {activePlan.remaining_soc_pct.toFixed(0)}%
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                    <div className="flex items-center justify-center gap-1 text-xs text-neutral-500 mb-1">
                      <Gauge className="w-3.5 h-3.5" />
                      <span>Total Distance</span>
                    </div>
                    <span className="text-lg font-bold font-mono text-neutral-900 dark:text-neutral-100">
                      {(activePlan.total_distance_m / 1000).toFixed(1)} km
                    </span>
                  </div>
                </div>

                {/* Visual Waypoint Sequence */}
                <div>
                  <span className="block text-xs font-semibold text-neutral-500 mb-2">Calculated Route Steps:</span>
                  <div className="flex items-center flex-wrap gap-2 text-xs font-medium">
                    {activePlan.route_waypoints.map((wpId, idx) => (
                      <React.Fragment key={wpId}>
                        <span className="px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700">
                          {getWpName(wpId)}
                        </span>
                        {idx < activePlan.route_waypoints.length - 1 && (
                          <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PAGE 2: 3D AIRSPACE SIMULATOR */}
        {activeTab === 'simulator' && (
          <FlightSimulatorPage
            waypoints={waypoints}
            corridors={corridors}
            restrictedZones={restrictedZones}
            weatherZones={weatherZones}
            buildings={buildings}
            activePlan={activePlan}
            config={config}
            onDynamicReplan={handleDynamicReplan}
            theme={theme}
          />
        )}

        {/* PAGE 3: WHAT-IF SCENARIOS */}
        {activeTab === 'scenarios' && (
          <CounterfactualLabPage
            config={config}
            cfData={cfData}
            loading={loading}
            onRunCounterfactuals={() => executePlan(config)}
          />
        )}

        {/* PAGE 4: HOW TO USE & WHAT THIS IS FOR */}
        {activeTab === 'guide' && (
          <HowToUsePage onNavigate={(tab) => setActiveTab(tab)} />
        )}
      </main>
    </div>
  );
}

export default App;
