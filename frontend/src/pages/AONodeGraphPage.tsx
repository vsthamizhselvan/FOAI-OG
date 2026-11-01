import React, { useState, useEffect, useMemo } from 'react';
import {
  Network,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Layers,
  Info
} from 'lucide-react';
import { PlanResponse, GraphNodeData, TraceStep } from '../types';

interface AONodeGraphPageProps {
  activePlan: PlanResponse | null;
}

export const AONodeGraphPage: React.FC<AONodeGraphPageProps> = ({ activePlan }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const trace: TraceStep[] = activePlan?.trace || [];
  const maxStep = Math.max(0, trace.length - 1);

  // Playback timer
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= maxStep) {
            setIsPlaying(false);
            return maxStep;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, maxStep]);

  // Current trace step data
  const currentTraceStep = trace[currentStepIndex] || null;
  const markedNodeIds = useMemo(() => {
    return new Set(currentTraceStep?.marked_nodes || []);
  }, [currentTraceStep]);

  const markedEdges = useMemo(() => {
    return currentTraceStep?.marked_edges || [];
  }, [currentTraceStep]);

  // Node costs at current step
  const nodeCosts = currentTraceStep?.node_costs || {};

  // All graph nodes from plan
  const graphNodes: Record<string, GraphNodeData> = activePlan?.graph || {};
  const nodeList = Object.values(graphNodes);

  // Layout positions for graph nodes in SVG canvas (Layered DAG layout)
  const layout = useMemo(() => {
    const coords: Record<string, { x: number; y: number }> = {};
    const layers: string[][] = [
      ['WP_START'],
      ['CHECK_WP_START_WP_CENTRAL_CORE', 'CHECK_WP_START_WP_WATERFRONT_BYPASS', 'WP_CENTRAL_CORE', 'WP_WATERFRONT_BYPASS'],
      ['CHECK_WP_CENTRAL_CORE_WP_NORTH_SKYWAY', 'CHECK_WP_CENTRAL_CORE_WP_EAST_CROSSING', 'WP_NORTH_SKYWAY', 'WP_EAST_CROSSING'],
      ['CHECK_WP_NORTH_SKYWAY_WP_DESTINATION', 'CHECK_WP_EAST_CROSSING_WP_DESTINATION', 'WP_DESTINATION', 'WP_EMERGENCY_HARBOR']
    ];

    layers.forEach((layer, layerIdx) => {
      const x = 110 + layerIdx * 230;
      const totalInLayer = layer.length;
      layer.forEach((nodeId, idx) => {
        const ySpacing = 580 / (totalInLayer + 1);
        const y = ySpacing * (idx + 1) + 40;
        coords[nodeId] = { x, y };
      });
    });

    nodeList.forEach((n, idx) => {
      if (!coords[n.node_id]) {
        coords[n.node_id] = { x: 300 + (idx % 3) * 160, y: 100 + Math.floor(idx / 3) * 120 };
      }
    });

    return coords;
  }, [nodeList]);

  const selectedNode = selectedNodeId ? graphNodes[selectedNodeId] : null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* Top Bar with Step Controls & Trace Info */}
      <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                AO* Search Graph Explorer
              </h2>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Step through hyperarc generation, conjunct checks, and bottom-up cost propagation.
            </p>
          </div>

          {/* Step-by-Step Playback Controls */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-xs">
            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIndex(0);
              }}
              disabled={currentStepIndex === 0}
              className="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 disabled:opacity-40 cursor-pointer"
              title="Reset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIndex((prev) => Math.max(0, prev - 1));
              }}
              disabled={currentStepIndex === 0}
              className="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 disabled:opacity-40 cursor-pointer"
              title="Previous Step"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3 py-1 rounded bg-black text-white dark:bg-white dark:text-black font-semibold flex items-center gap-1 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
              <span>{isPlaying ? 'Pause' : 'Play Trace'}</span>
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIndex((prev) => Math.min(maxStep, prev + 1));
              }}
              disabled={currentStepIndex >= maxStep}
              className="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 disabled:opacity-40 cursor-pointer"
              title="Next Step"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
            <span className="text-neutral-500 font-mono px-2 text-[11px]">
              Step <strong className="text-neutral-900 dark:text-neutral-100">{currentStepIndex}</strong> / {maxStep}
            </span>
          </div>
        </div>

        {/* Step Explanation Banner */}
        {currentTraceStep && (
          <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-700 dark:text-neutral-300">
            <span className="font-semibold text-neutral-900 dark:text-neutral-100 block mb-0.5">
              Step {currentTraceStep.step_index}: {currentTraceStep.action_taken}
            </span>
            <p className="leading-relaxed">{currentTraceStep.explanation}</p>
          </div>
        )}
      </div>

      {/* Main Graph Canvas & Node Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* SVG Graph Interactive Canvas */}
        <div className="lg:col-span-3 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-500 border-b border-neutral-200 dark:border-neutral-800 pb-2 mb-2">
            <span>AND-OR TOPOLOGY (CLICK NODE TO INSPECT)</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-black dark:bg-white"></span> Waypoint
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full border border-neutral-400"></span> AND Check
              </span>
            </div>
          </div>

          <div className="w-full flex-1 overflow-auto">
            <svg className="w-full min-w-[780px] h-[580px]" viewBox="0 0 920 640">
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#000000" className="dark:fill-white" />
                </marker>
                <marker
                  id="arrow-dim"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#a1a1aa" />
                </marker>
              </defs>

              {/* Render Directed Edges */}
              {nodeList.map((node) => {
                const srcPos = layout[node.node_id];
                if (!srcPos) return null;

                return node.hyperarcs.map((ha) => {
                  return ha.target_node_ids.map((tgtId) => {
                    const tgtPos = layout[tgtId];
                    if (!tgtPos) return null;

                    const isMarked = markedEdges.some(
                      (me) => me.source === node.node_id && me.target === tgtId
                    );

                    return (
                      <g key={`${node.node_id}-${tgtId}`}>
                        <line
                          x1={srcPos.x}
                          y1={srcPos.y}
                          x2={tgtPos.x}
                          y2={tgtPos.y}
                          stroke={isMarked ? '#000000' : '#d4d4d8'}
                          strokeWidth={isMarked ? 2.0 : 1.0}
                          strokeDasharray={isMarked ? 'none' : '4,4'}
                          markerEnd={isMarked ? 'url(#arrow)' : 'url(#arrow-dim)'}
                        />
                      </g>
                    );
                  });
                });
              })}

              {/* Render Graph Nodes */}
              {nodeList.map((node) => {
                const pos = layout[node.node_id];
                if (!pos) return null;

                const isMarked = markedNodeIds.has(node.node_id);
                const isSelected = selectedNodeId === node.node_id;
                const cost = nodeCosts[node.node_id] !== undefined ? nodeCosts[node.node_id] : node.cost;

                let fillColor = isMarked ? '#000000' : '#ffffff';
                let strokeColor = isSelected ? '#000000' : '#a1a1aa';
                let textColor = isMarked ? '#ffffff' : '#000000';

                const isCheckConjunct = node.node_id.startsWith('CHECK_');

                return (
                  <g
                    key={node.node_id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => setSelectedNodeId(node.node_id)}
                    className="cursor-pointer"
                  >
                    {isCheckConjunct ? (
                      <circle
                        r={16}
                        fill={isMarked ? '#27272a' : '#f4f4f5'}
                        stroke={strokeColor}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                      />
                    ) : (
                      <rect
                        x={-55}
                        y={-18}
                        width={110}
                        height={36}
                        rx={6}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                      />
                    )}

                    <text
                      y={isCheckConjunct ? 3 : -2}
                      textAnchor="middle"
                      fill={isCheckConjunct ? (isMarked ? '#ffffff' : '#27272a') : textColor}
                      fontSize={9}
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {isCheckConjunct
                        ? 'AND✓'
                        : node.name.length > 14
                        ? `${node.name.slice(0, 12)}..`
                        : node.name}
                    </text>

                    {!isCheckConjunct && (
                      <text
                        y={10}
                        textAnchor="middle"
                        fill={isMarked ? '#d4d4d8' : '#71717a'}
                        fontSize={8}
                        fontFamily="monospace"
                      >
                        cost: {cost > 0 && cost < 1e8 ? cost.toFixed(1) : cost === 0 ? '0' : '∞'}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Node Inspector Side Panel */}
        <div className="lg:col-span-1 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-4 text-xs font-mono">
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
            <h3 className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              NODE INSPECTOR
            </h3>
            {selectedNode && (
              <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
                {selectedNode.node_type}
              </span>
            )}
          </div>

          {selectedNode ? (
            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-neutral-500 block">NODE ID</span>
                <span className="text-neutral-900 dark:text-neutral-100 font-bold">{selectedNode.node_id}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 block">NAME</span>
                <span className="text-neutral-700 dark:text-neutral-300">{selectedNode.name}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <div>
                  <span className="text-[10px] text-neutral-500 block">COST</span>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">
                    {nodeCosts[selectedNode.node_id] !== undefined
                      ? nodeCosts[selectedNode.node_id].toFixed(2)
                      : selectedNode.cost.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 block">HEURISTIC</span>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">
                    {selectedNode.heuristic.toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-neutral-500 block">STATUS</span>
                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                  {selectedNode.solved ? 'SOLVED' : selectedNode.infeasible ? 'INFEASIBLE' : 'EXPANDED'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-neutral-400">
              <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Click any node in the topology above to inspect heuristic costs and propagation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
