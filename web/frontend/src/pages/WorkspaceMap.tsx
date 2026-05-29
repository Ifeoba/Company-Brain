import { useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useConfirmSuggestion, useDiscoverRelationships, useWorkspaceMap } from "../api/hooks";
import AppTopbar from "../components/Layout";
import Icon from "../components/Icon";
import type { RelationshipSuggestion, WorkspaceNode } from "../types";

const NW = 164;
const NH = 76;

function circularPositions(count: number, w: number, h: number) {
  const cx = w / 2, cy = h / 2;
  if (count === 0) return [];
  if (count === 1) return [{ x: cx - NW / 2, y: cy - NH / 2 }];
  const r = Math.min(cx * 0.68, cy * 0.68);
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i / count) - Math.PI / 2;
    return { x: cx + r * Math.cos(angle) - NW / 2, y: cy + r * Math.sin(angle) - NH / 2 };
  });
}

const REL_COLOR: Record<string, string> = {
  "depends-on": "var(--bad)",
  "uses": "var(--info)",
  "related-to": "var(--dim)",
  "feeds-into": "var(--drift)",
};

export default function WorkspaceMap() {
  const { data: nodes = [], isLoading } = useWorkspaceMap();
  const discover = useDiscoverRelationships();
  const confirmSuggestion = useConfirmSuggestion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Array<{ x: number; y: number }>>([]);
  const [suggestions, setSuggestions] = useState<RelationshipSuggestion[]>([]);
  const navigate = useNavigate();

  async function handleDiscover() {
    const found = await discover.mutateAsync();
    setSuggestions(found);
  }

  function dismissSuggestion(idx: number) {
    setSuggestions((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleConfirm(s: RelationshipSuggestion, idx: number) {
    await confirmSuggestion.mutateAsync({ from_slug: s.from_slug, to_slug: s.to_slug, rel_type: s.rel_type });
    dismissSuggestion(idx);
  }

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const calc = () => {
      const { width, height } = el.getBoundingClientRect();
      setPositions(circularPositions(nodes.length, width, height));
    };
    calc();
    const obs = new ResizeObserver(calc);
    obs.observe(el);
    return () => obs.disconnect();
  }, [nodes.length]);

  const slugToIdx = Object.fromEntries(nodes.map((n, i) => [n.slug, i]));
  const allRels = nodes.flatMap((n) => n.relationships);

  function center(slug: string) {
    const p = positions[slugToIdx[slug]];
    if (!p) return null;
    return { x: p.x + NW / 2, y: p.y + NH / 2 };
  }

  return (
    <div className="bl-shell">
      <AppTopbar />

      {/* Discovery toolbar */}
      {!isLoading && nodes.length >= 2 && (
        <div className="wm-toolbar">
          <button
            className="btn btn-sm btn-ghost"
            onClick={handleDiscover}
            disabled={discover.isPending}
          >
            <Icon name="spark" size={12} />
            {discover.isPending ? "Scanning…" : "Discover connections"}
          </button>
          <span className="dim" style={{ fontSize: 12 }}>
            Claude scans your brain content and suggests relationships.
          </span>
        </div>
      )}

      {/* Suggestions panel */}
      {suggestions.length > 0 && (
        <div className="wm-suggestions">
          <div className="wm-suggestions-head">
            <span>{suggestions.length} suggested connection{suggestions.length > 1 ? "s" : ""}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setSuggestions([])}>Clear all</button>
          </div>
          {suggestions.map((s, i) => (
            <div key={i} className="wm-suggestion-item">
              <div className="wm-suggestion-names">
                <b>{s.from_name}</b>
                <span className="wm-suggestion-rel">{s.rel_type}</span>
                <b>{s.to_name}</b>
              </div>
              <div className="wm-suggestion-reason">{s.reason}</div>
              <div className="wm-suggestion-actions">
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => handleConfirm(s, i)}
                  disabled={confirmSuggestion.isPending}
                >
                  Add connection
                </button>
                <button className="btn btn-sm btn-ghost" onClick={() => dismissSuggestion(i)}>
                  Skip
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="wm-canvas" ref={containerRef}>
        {isLoading ? null : nodes.length === 0 ? (
          <div className="wm-empty">
            <p>No brains in your workspace yet.</p>
            <Link to="/" className="btn btn-primary">← Back to brains</Link>
          </div>
        ) : (
          <>
            {/* relationship lines */}
            <svg className="wm-svg">
              <defs>
                {Object.entries(REL_COLOR).map(([type, color]) => (
                  <marker
                    key={type}
                    id={`arrow-${type.replace("-", "")}`}
                    markerWidth="7" markerHeight="7"
                    refX="5" refY="3"
                    orient="auto"
                  >
                    <path d="M0,0 L0,6 L7,3 z" fill={color} />
                  </marker>
                ))}
              </defs>
              {allRels.map((rel) => {
                const from = center(rel.from_slug);
                const to = center(rel.to_slug);
                if (!from || !to) return null;
                const color = REL_COLOR[rel.rel_type] ?? "var(--dim)";
                const markerId = `arrow-${rel.rel_type.replace("-", "")}`;
                const mx = (from.x + to.x) / 2;
                const my = (from.y + to.y) / 2;
                return (
                  <g key={rel.id}>
                    <line
                      x1={from.x} y1={from.y}
                      x2={to.x} y2={to.y}
                      stroke={color}
                      strokeWidth={1.5}
                      strokeOpacity={0.55}
                      markerEnd={`url(#${markerId})`}
                    />
                    <text
                      x={mx} y={my - 6}
                      textAnchor="middle"
                      fontSize={10}
                      fill={color}
                      fontFamily="var(--font-mono)"
                    >
                      {rel.rel_type}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* brain nodes */}
            {nodes.map((node: WorkspaceNode, i) => {
              const p = positions[i];
              if (!p) return null;
              const scoreColor = node.readiness_score >= 80
                ? "var(--ok)"
                : node.readiness_score >= 50
                ? "var(--warn)"
                : "var(--bad)";
              return (
                <div
                  key={node.slug}
                  className="wm-node"
                  style={{ left: p.x, top: p.y }}
                  onClick={() => navigate(`/brains/${node.slug}`)}
                >
                  <div className="wm-node-name">{node.name}</div>
                  <div className="wm-node-meta">
                    <span style={{ color: scoreColor, fontFamily: "var(--font-mono)", fontSize: 11 }}>
                      {node.readiness_score}
                    </span>
                    <span className="dim" style={{ fontSize: 11 }}>/100</span>
                    <span
                      className={`pill ${node.status === "ready" ? "ok" : "info"}`}
                      style={{ fontSize: 10, padding: "1px 6px", marginLeft: 6 }}
                    >
                      <span className="dot" style={{ background: "currentColor" }} />
                      {node.status === "ready" ? "Ready" : "In formation"}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* legend */}
            <div className="wm-legend">
              {Object.entries(REL_COLOR).map(([type, color]) => (
                <span key={type} className="wm-legend-item">
                  <span style={{ width: 20, height: 1.5, background: color, opacity: 0.7, display: "inline-block", verticalAlign: "middle" }} />
                  {type}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
