import React, { useState } from 'react';
import {
  Split,
  Play,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BatteryCharging,
  Clock,
  Shield,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { CounterfactualResponse, ScenarioOutcome, MissionConfig } from '../types';

interface CounterfactualLabProps {
  config: MissionConfig;
  cfData: CounterfactualResponse | null;
  loading: boolean;
  onRunCounterfactuals: () => void;
  onSelectScenario?: (scenario: ScenarioOutcome) => void;
}

export const CounterfactualLabPage: React.FC<CounterfactualLabProps> = ({
  cfData,
  loading,
  onRunCounterfactuals
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('CF_LOW_BATTERY');

  const baseline = cfData?.baseline;
  const counterfactuals = cfData?.counterfactuals || [];
  const selectedScenario =
    counterfactuals.find((c) => c.scenario_id === selectedScenarioId) || counterfactuals[0];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            What-If Counterfactual Lab
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Evaluate alternative realities side-by-side before takeoff to ensure provable safety resilience.
          </p>
        </div>
        <button
          onClick={onRunCounterfactuals}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black font-semibold text-xs hover:opacity-90 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{loading ? 'Evaluating Scenarios...' : 'Re-evaluate All Scenarios'}</span>
        </button>
      </div>

      {/* Side-by-Side Comparison: Baseline vs Selected Scenario */}
      {baseline && selectedScenario && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Baseline Card */}
          <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Baseline (Actual Flight Plan)
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                85% Initial SoC
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {baseline.name}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {baseline.description}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800 text-xs">
              <div>
                <span className="text-neutral-500 text-[10px] block">BATTERY</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                  {baseline.remaining_soc_pct.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-neutral-500 text-[10px] block">TIME</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                  {(baseline.travel_time_s / 60).toFixed(1)}m
                </span>
              </div>
              <div>
                <span className="text-neutral-500 text-[10px] block">EXPANSIONS</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                  {baseline.expanded_nodes} nodes
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 text-xs text-neutral-600 dark:text-neutral-400">
              <span className="font-semibold text-neutral-900 dark:text-neutral-100 block mb-0.5">
                Route Cleared:
              </span>
              <span>{baseline.route_waypoint_names?.join(' → ') || baseline.route_waypoint_ids.join(' → ')}</span>
            </div>
          </div>

          {/* Selected Counterfactual Scenario Card */}
          <div className="p-6 rounded-xl border border-neutral-900 dark:border-neutral-100 bg-white dark:bg-neutral-900 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                Hypothetical Counterfactual
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-black text-white dark:bg-white dark:text-black">
                {selectedScenario.is_emergency_landing ? 'Emergency Divert' : 'Detour Active'}
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {selectedScenario.name}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {selectedScenario.description}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800 text-xs">
              <div>
                <span className="text-neutral-500 text-[10px] block">BATTERY</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                  {selectedScenario.remaining_soc_pct.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-neutral-500 text-[10px] block">TIME</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                  {(selectedScenario.travel_time_s / 60).toFixed(1)}m
                </span>
              </div>
              <div>
                <span className="text-neutral-500 text-[10px] block">EXPANSIONS</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                  {selectedScenario.expanded_nodes} nodes
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 text-xs text-neutral-600 dark:text-neutral-400">
              <span className="font-semibold text-neutral-900 dark:text-neutral-100 block mb-0.5">
                Causal Adaptation:
              </span>
              <span>{selectedScenario.causal_reason}</span>
            </div>
          </div>
        </div>
      )}

      {/* Scenario Selection Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
          All Evaluated Scenarios ({counterfactuals.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {counterfactuals.map((sc) => {
            const isSelected = selectedScenarioId === sc.scenario_id;
            return (
              <button
                key={sc.scenario_id}
                onClick={() => setSelectedScenarioId(sc.scenario_id)}
                className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-neutral-900 bg-neutral-50 dark:border-neutral-100 dark:bg-neutral-800/80 shadow-xs'
                    : 'border-neutral-200 bg-white hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
                    {sc.name.split(':')[0]}
                  </span>
                  {isSelected && <ArrowUpRight className="w-3.5 h-3.5" />}
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                  {sc.description}
                </p>
                <div className="mt-3 flex items-center justify-between text-[10px] font-mono border-t border-neutral-100 dark:border-neutral-800 pt-2 text-neutral-600 dark:text-neutral-400">
                  <span>SoC: {sc.remaining_soc_pct.toFixed(0)}%</span>
                  <span>{sc.is_emergency_landing ? 'DIVERT' : 'CLEARED'}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
