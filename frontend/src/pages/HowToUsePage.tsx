import React from 'react';
import {
  HelpCircle,
  Compass,
  Box,
  Split,
  Bot,
  BatteryCharging,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Zap,
  Layers,
  AlertTriangle
} from 'lucide-react';

interface HowToUsePageProps {
  onNavigate: (tab: 'planner' | 'simulator' | 'scenarios') => void;
}

export const HowToUsePage: React.FC<HowToUsePageProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">
      {/* 1. Header Banner */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <div className="flex items-center gap-2.5 text-xs font-mono font-semibold uppercase tracking-wider text-neutral-500 mb-2">
          <HelpCircle className="w-4 h-4" />
          <span>Documentation & User Guide</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          How to Use AERON & What It Is For
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 max-w-2xl leading-relaxed">
          A guide to the Autonomous Aerial Vehicle Flight Planner, how the AI makes safety decisions, and how to use every feature on this website.
        </p>
      </div>

      {/* 2. What Is This Website For? */}
      <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            What is This Website For?
          </h2>
        </div>

        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
          Standard flight systems (like car GPS or standard A* algorithms) only calculate the shortest distance between two points. In urban aerial transport (flying cars / EVTOLs), this reactive approach is unsafe.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs text-neutral-900 dark:text-neutral-100">
              <Zap className="w-4 h-4" />
              <span>Simultaneous Safety Checks</span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Every flight segment requires reaching the next waypoint <strong>AND</strong> simultaneously verifying battery reserve $\ge 15\%$, avoiding storm crosswinds, and respecting no-fly zones.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs text-neutral-900 dark:text-neutral-100">
              <ShieldCheck className="w-4 h-4" />
              <span>Autonomous Diversion</span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              If battery drops unexpectedly (e.g. to 32%), the AI does not crash. It automatically recognizes that the primary destination is unreachable and safely diverts to the nearest certified vertipad.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs text-neutral-900 dark:text-neutral-100">
              <Split className="w-4 h-4" />
              <span>What-If "Imagination"</span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Before the vehicle takes off, the AI simulates alternative hypothetical realities (What if wind speeds double? What if a skyway closes?) to guarantee resilience.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Step-by-Step: How to Use This Website */}
      <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-6">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            How to Use This Website (Step-by-Step)
          </h2>
        </div>

        <div className="space-y-4 text-xs text-neutral-600 dark:text-neutral-400">
          {/* Step 1 */}
          <div className="flex items-start gap-3 p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
            <span className="w-6 h-6 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs shrink-0">
              1
            </span>
            <div className="space-y-1">
              <strong className="text-neutral-900 dark:text-neutral-100 text-sm block">
                Go to "Flight Planner" and Enter Your Input
              </strong>
              <p>
                You have two ways to give input:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-1 pt-1">
                <li>
                  <strong>Text Prompt:</strong> Type a natural sentence (e.g., <em>"Fly with 32% battery"</em> or <em>"Fastest route avoiding civic core"</em>).
                </li>
                <li>
                  <strong>Custom Numbers:</strong> Switch to the numbers tab to type exact battery percentage (e.g. 28% vs 85%), speed (km/h), origin, and destination.
                </li>
              </ul>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3 p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
            <span className="w-6 h-6 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs shrink-0">
              2
            </span>
            <div className="space-y-1">
              <strong className="text-neutral-900 dark:text-neutral-100 text-sm block">
                Click "Run AI" and Review the Results
              </strong>
              <p>
                The AI processes your flight in milliseconds and provides:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-1 pt-1">
                <li><strong>Clear Status:</strong> Shows whether the route was <code className="bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded text-[11px]">CLEARED</code> or <code className="bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded text-[11px]">DIVERTED</code>.</li>
                <li><strong>AI Decision Explanation:</strong> Explains exactly <em>why</em> this route was selected.</li>
                <li><strong>3 Core Stats:</strong> Total flight duration (minutes), remaining battery SoC (%), and distance (km).</li>
                <li><strong>Step-by-Step Waypoint Sequence:</strong> The exact route from origin to touchdown.</li>
              </ul>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3 p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
            <span className="w-6 h-6 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs shrink-0">
              3
            </span>
            <div className="space-y-1">
              <strong className="text-neutral-900 dark:text-neutral-100 text-sm block">
                Go to "3D Airspace Simulator" to Watch the Vehicle Fly
              </strong>
              <p>
                Watch your calculated route come alive in full 3D:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-1 pt-1">
                <li>Click <strong>Play / Pause</strong> to start or halt real-time flight motion.</li>
                <li>Switch camera angles between <strong>Follow</strong> (chase camera behind vehicle), <strong>Orbit</strong> (free mouse rotation), and <strong>Top-Down</strong>.</li>
                <li>Inspect real-time telemetry HUD showing live airspeed, altitude, and battery drain.</li>
              </ul>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-start gap-3 p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
            <span className="w-6 h-6 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs shrink-0">
              4
            </span>
            <div className="space-y-1">
              <strong className="text-neutral-900 dark:text-neutral-100 text-sm block">
                Explore "What-If Scenarios" (Counterfactual Lab)
              </strong>
              <p>
                Compare the baseline normal flight side-by-side against 5 different stress test conditions (such as low battery, drone swarm corridor blockages, storm crosswinds, and vertipad closures).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Interactive Quick Launchers */}
      <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
          Ready to try it? Jump straight in:
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onNavigate('planner')}
            className="flex items-center justify-between p-3.5 rounded-lg border border-neutral-200 hover:border-black dark:border-neutral-800 dark:hover:border-white text-left transition-colors cursor-pointer"
          >
            <div>
              <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 block">
                Flight Planner
              </span>
              <span className="text-[11px] text-neutral-500">Give custom manual inputs</span>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-400 shrink-0" />
          </button>

          <button
            onClick={() => onNavigate('simulator')}
            className="flex items-center justify-between p-3.5 rounded-lg border border-neutral-200 hover:border-black dark:border-neutral-800 dark:hover:border-white text-left transition-colors cursor-pointer"
          >
            <div>
              <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 block">
                3D Airspace Simulator
              </span>
              <span className="text-[11px] text-neutral-500">Watch flights in 3D</span>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-400 shrink-0" />
          </button>

          <button
            onClick={() => onNavigate('scenarios')}
            className="flex items-center justify-between p-3.5 rounded-lg border border-neutral-200 hover:border-black dark:border-neutral-800 dark:hover:border-white text-left transition-colors cursor-pointer"
          >
            <div>
              <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 block">
                What-If Scenarios
              </span>
              <span className="text-[11px] text-neutral-500">Compare alternative futures</span>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-400 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};
