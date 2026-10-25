import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

import cn from "~/utils/cn";
import type { TopologyGraph, TopologyNode } from "~/utils/topology";

interface TopologyProps {
  graph: TopologyGraph;
  onNodeClick?: (node: TopologyNode) => void;
}

interface ViewState {
  scale: number;
  tx: number;
  ty: number;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 3;

/** Lightens a hex color by mixing it with white, for gradient highlights. */
function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((num >> 16) & 255) + 255 * amount));
  const g = Math.min(255, Math.round(((num >> 8) & 255) + 255 * amount));
  const b = Math.min(255, Math.round((num & 255) + 255 * amount));
  return `rgb(${r}, ${g}, ${b})`;
}

/** Builds a smooth cubic bezier path between two nodes. */
function edgePath(from: TopologyNode, to: TopologyNode): string {
  const my = (from.y + to.y) / 2;
  const bend = Math.min(28, Math.abs(to.y - from.y) * 0.25);
  return `M ${from.x} ${from.y} C ${from.x + bend} ${my}, ${to.x - bend} ${my}, ${to.x} ${to.y}`;
}

export default function Topology({ graph, onNodeClick }: TopologyProps) {
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<ViewState>({ scale: 1, tx: 40, ty: 40 });
  const dragRef = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null);
  const [hovered, setHovered] = useState<TopologyNode | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  const colors = useMemo(() => Array.from(new Set(graph.nodes.map((n) => n.color))), [graph]);

  const handleWheel = useCallback((event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    setView((v) => ({
      ...v,
      scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor)),
    }));
  }, []);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      dragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        tx: view.tx,
        ty: view.ty,
      };
    },
    [view.tx, view.ty],
  );

  const handleMouseMove = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (dragRef.current) {
      const dx = event.clientX - dragRef.current.startX;
      const dy = event.clientY - dragRef.current.startY;
      setView((v) => ({
        ...v,
        tx: dragRef.current!.tx + dx,
        ty: dragRef.current!.ty + dy,
      }));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleNodeHover = useCallback((node: TopologyNode | null, event?: React.MouseEvent) => {
    setHovered(node);
    if (event) {
      setCursor({ x: event.clientX, y: event.clientY });
    }
  }, []);

  const handleNodeClick = useCallback(
    (node: TopologyNode) => {
      if (onNodeClick) {
        onNodeClick(node);
        return;
      }
      if (node.machineId) {
        navigate(`/machines/${node.machineId}`);
      }
    },
    [navigate, onNodeClick],
  );

  return (
    <div className="shadow-surface border-line from-surface via-subtle/60 to-subtle relative overflow-hidden rounded-xl border bg-gradient-to-br">
      <div aria-hidden="true" className="topology-dot-grid pointer-events-none absolute inset-0" />
      <svg
        className="relative h-[600px] w-full cursor-grab touch-none select-none active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseLeave={() => handleNodeHover(null)}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        ref={svgRef}
        role="img"
        viewBox={`0 0 ${graph.width} ${graph.height}`}
      >
        <title>Tailnet topology</title>
        <defs>
          {colors.map((color) => {
            const key = color.replace("#", "");
            return (
              <radialGradient cx="35%" cy="30%" id={`topology-grad-${key}`} key={key} r="80%">
                <stop offset="0%" stopColor={lighten(color, 0.45)} />
                <stop offset="100%" stopColor={color} />
              </radialGradient>
            );
          })}
          {colors.map((color) => {
            const key = color.replace("#", "");
            return (
              <filter
                height="180%"
                id={`topology-shadow-${key}`}
                key={key}
                width="180%"
                x="-40%"
                y="-40%"
              >
                <feDropShadow
                  dx="0"
                  dy="2"
                  floodColor={color}
                  floodOpacity="0.45"
                  stdDeviation="3"
                />
              </filter>
            );
          })}
        </defs>
        <g transform={`translate(${view.tx},${view.ty}) scale(${view.scale})`}>
          {/* Edges */}
          {graph.edges.map((edge) => {
            const from = graph.nodes.find((n) => n.id === edge.from);
            const to = graph.nodes.find((n) => n.id === edge.to);
            if (!from || !to) return null;

            return (
              <path
                className={cn(
                  "transition-colors duration-200",
                  edge.kind === "subnet"
                    ? "animate-dash-flow stroke-muted/80"
                    : "stroke-line-strong",
                )}
                d={edgePath(from, to)}
                fill="none"
                key={`${edge.from}-${edge.to}`}
                strokeDasharray={edge.kind === "subnet" ? "5 4" : undefined}
                strokeLinecap="round"
                strokeWidth={1.5}
              />
            );
          })}

          {/* Group labels */}
          {Array.from(new Set(graph.nodes.map((n) => n.group))).map((group) => {
            const groupNodes = graph.nodes.filter((n) => n.group === group && n.kind === "node");
            if (groupNodes.length === 0) return null;
            const minX = Math.min(...groupNodes.map((n) => n.x));
            const maxX = Math.max(...groupNodes.map((n) => n.x));
            const y = groupNodes[0].y;
            const cx = (minX + maxX) / 2;
            const pillWidth = group.length * 8 + 24;

            return (
              <g key={group}>
                <rect
                  className="fill-subtle/90"
                  height={22}
                  rx={11}
                  width={pillWidth}
                  x={cx - pillWidth / 2}
                  y={y - 57}
                />
                <text
                  className="fill-muted text-xs font-semibold tracking-wide uppercase"
                  textAnchor="middle"
                  x={cx}
                  y={y - 42}
                >
                  {group}
                </text>
              </g>
            );
          })}
          {/* Nodes */}
          {graph.nodes.map((node) => {
            const isSubnet = node.kind === "subnet";
            const radius = isSubnet ? 14 : 24;
            const colorKey = node.color.replace("#", "");

            return (
              <g
                className="group cursor-pointer"
                key={node.id}
                onClick={(event) => {
                  event.stopPropagation();
                  handleNodeClick(node);
                }}
                onMouseEnter={(event) => handleNodeHover(node, event)}
                onMouseLeave={() => handleNodeHover(null)}
                transform={`translate(${node.x},${node.y})`}
              >
                {/* Exit node ring */}
                {node.isExitNode ? (
                  <circle
                    className="fill-none stroke-amber-400/90 transition-colors duration-200 group-hover:stroke-amber-400 dark:stroke-amber-500/90"
                    r={radius + 7}
                    strokeDasharray="6 4"
                    strokeWidth={2}
                  />
                ) : null}

                {/* Hover glow ring */}
                <circle
                  className="fill-none opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  r={radius + 5}
                  stroke={node.color}
                  strokeWidth={2}
                  style={{ filter: `drop-shadow(0 0 5px ${node.color})` }}
                />

                {/* Node body */}
                <circle
                  className={cn("transition-opacity duration-200", node.isExpired && "opacity-40")}
                  fill={`url(#topology-grad-${colorKey})`}
                  r={radius}
                  stroke={node.color}
                  strokeWidth={2}
                  style={{ filter: `url(#topology-shadow-${colorKey})` }}
                />

                {/* Inner highlight */}
                <circle
                  className="fill-white/25"
                  cx={-radius * 0.3}
                  cy={-radius * 0.35}
                  r={radius * 0.5}
                />

                {/* Online indicator */}
                {!isSubnet ? (
                  <circle
                    className={cn("stroke-surface", node.isOnline ? "fill-ok" : "fill-line-strong")}
                    cx={radius - 6}
                    cy={radius - 6}
                    r={5}
                    strokeWidth={2}
                  />
                ) : null}

                {/* Label */}
                <text
                  className={cn("fill-muted text-xs", isSubnet && "font-mono")}
                  textAnchor="middle"
                  y={radius + 16}
                >
                  {node.label.length > 18 ? `${node.label.slice(0, 17)}…` : node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Hover tooltip */}
      {hovered && cursor ? (
        <div
          className="shadow-overlay border-line bg-surface/95 pointer-events-none fixed z-50 w-56 rounded-xl border p-3 text-sm backdrop-blur-sm"
          style={{ left: cursor.x + 12, top: cursor.y + 12 }}
        >
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: hovered.color }}
            />
            <p className="truncate font-semibold">{hovered.label}</p>
          </div>
          <p className="mt-0.5 text-xs opacity-60">{hovered.group}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {hovered.kind === "subnet" ? (
              <span className="bg-subtle rounded-md px-1.5 py-0.5 text-xs">Subnet route</span>
            ) : (
              <>
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-xs",
                    hovered.isOnline ? "bg-ok-subtle text-ok" : "bg-subtle text-muted",
                  )}
                >
                  {hovered.isOnline ? "Online" : "Offline"}
                </span>
                {hovered.isExitNode ? (
                  <span className="bg-warn-subtle text-warn rounded-md px-1.5 py-0.5 text-xs">
                    Exit node
                  </span>
                ) : null}
                {hovered.isExpired ? (
                  <span className="bg-bad-subtle text-bad rounded-md px-1.5 py-0.5 text-xs">
                    Expired
                  </span>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}

      {/* Zoom controls */}
      <div className="shadow-overlay border-line/80 bg-surface/80 absolute right-3 bottom-3 flex flex-col overflow-hidden rounded-lg border backdrop-blur-md">
        <button
          aria-label="Zoom in"
          className="text-muted hover:bg-subtle hover:text-fg flex h-9 w-9 items-center justify-center text-lg font-medium transition-colors"
          onClick={() => setView((v) => ({ ...v, scale: Math.min(MAX_SCALE, v.scale * 1.2) }))}
          type="button"
        >
          +
        </button>
        <div className="bg-line h-px" />
        <button
          aria-label="Zoom out"
          className="text-muted hover:bg-subtle hover:text-fg flex h-9 w-9 items-center justify-center text-lg font-medium transition-colors"
          onClick={() => setView((v) => ({ ...v, scale: Math.max(MIN_SCALE, v.scale / 1.2) }))}
          type="button"
        >
          −
        </button>
        <div className="bg-line h-px" />
        <button
          aria-label="Reset view"
          className="text-muted hover:bg-subtle hover:text-fg flex h-9 w-9 items-center justify-center text-xs font-medium transition-colors"
          onClick={() => setView({ scale: 1, tx: 40, ty: 40 })}
          type="button"
        >
          ⟲
        </button>
      </div>
    </div>
  );
}
