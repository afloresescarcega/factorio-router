import React, { useState } from "react";
import { entitySize } from "./layout.js";
import { title } from "./planner.js";

const COLORS = {
  machine: "#6ba0a0",
  belt: "#e0b348",
  inserter: "#4f9fd6",
  pole: "#c98ad6",
};
const WIRE = "#c8763a";
const GRID = "#372f27";
function Entity({ entity }) {
  const [w, h] = entitySize(entity);
  const { x, y } = entity.position;
  const machine = w === 3;
  const pole = entity.name === "medium-electric-pole";
  const inserter = entity.name.includes("inserter");
  const underground = entity.name.includes("underground");
  const color = machine
    ? COLORS.machine
    : pole
      ? COLORS.pole
      : inserter
        ? COLORS.inserter
        : COLORS.belt;
  return (
    <g>
      <title>
        {title(entity.name)}
        {entity.recipe ? ` · ${title(entity.recipe)}` : ""} · {x}, {y}
        {entity.type ? ` · ${entity.type}` : ""}
      </title>
      <rect
        x={x - w / 2 + 0.06}
        y={y - h / 2 + 0.06}
        width={w - 0.12}
        height={h - 0.12}
        rx={machine ? 0.18 : 0.08}
        fill={color}
        fillOpacity={machine ? 0.85 : pole ? 0.9 : 0.45}
        stroke={color}
        strokeWidth=".045"
      />
      {machine && (
        <>
          <rect
            x={x - 0.8}
            y={y - 0.8}
            width="1.6"
            height="1.6"
            rx=".12"
            fill="#181310"
            fillOpacity=".7"
          />
          <text
            x={x}
            y={y + 0.15}
            textAnchor="middle"
            fontSize=".44"
            fill="#ffe6c0"
          >
            {entity.name === "electric-furnace"
              ? "EF"
              : `A${entity.name.at(-1)}`}
          </text>
        </>
      )}
      {pole && <circle cx={x} cy={y} r=".15" fill="#1a1512" />}
      {!machine && !pole && (
        <g
          transform={`translate(${x} ${y}) rotate(${((entity.direction || 0) + (inserter ? 8 : 0)) * 22.5})`}
        >
          {inserter ? (
            <path
              d="M0 .33 V-.34 M-.13 -.16 L0 -.34 L.13 -.16"
              fill="none"
              stroke={color}
              strokeWidth=".13"
            />
          ) : (
            <path
              d="M-.2 .13 L0 -.13 L.2 .13"
              fill="none"
              stroke="#ffe6c0"
              strokeWidth=".09"
            />
          )}
          {underground && (
            <path
              d={entity.type === "input" ? "M-.3 -.33 H.3" : "M-.3 .33 H.3"}
              stroke="#ffd98a"
              strokeWidth=".15"
            />
          )}
        </g>
      )}
    </g>
  );
}

export default function BlueprintPreview({ layout }) {
  const [zoom, setZoom] = useState(1);
  const { bounds, blueprint, annotations } = layout;
  const width = bounds.right - bounds.left + 1,
    height = bounds.bottom - bounds.top + 1;
  const entityByNumber = new Map(
    blueprint.blueprint.entities.map((entity) => [
      entity.entity_number,
      entity,
    ]),
  );
  return (
    <>
      <div className="preview-toolbar">
        <span>
          Entity view{" "}
          <span className="muted">
            · {width} × {height} tiles
          </span>
        </span>
        <div className="zoom-controls">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.5))}
            disabled={zoom <= 0.5}
            aria-label="Zoom out"
          >
            −
          </button>
          <button type="button" onClick={() => setZoom(1)}>
            Fit
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(5, z + 0.5))}
            disabled={zoom >= 5}
            aria-label="Zoom in"
          >
            +
          </button>
        </div>
      </div>
      <div
        className="preview-scroll"
        tabIndex="0"
        aria-label="Blueprint preview, scroll to pan when zoomed"
      >
        <svg
          role="img"
          aria-label={`Blueprint with ${blueprint.blueprint.entities.length} entities`}
          viewBox={`${bounds.left} ${bounds.top} ${width} ${height}`}
          style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}
        >
          <defs>
            <pattern
              id="tile-grid"
              x="0"
              y="0"
              width="1"
              height="1"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M1 0H0V1"
                fill="none"
                stroke={GRID}
                strokeWidth=".045"
              />
            </pattern>
          </defs>
          <rect
            x={bounds.left}
            y={bounds.top}
            width={width}
            height={height}
            fill="url(#tile-grid)"
          />
          {blueprint.blueprint.wires.map(([a, , b]) => (
            <line
              key={`${a}-${b}`}
              x1={entityByNumber.get(a).position.x}
              y1={entityByNumber.get(a).position.y}
              x2={entityByNumber.get(b).position.x}
              y2={entityByNumber.get(b).position.y}
              stroke={WIRE}
              strokeWidth=".07"
              opacity=".7"
            />
          ))}
          {blueprint.blueprint.entities.map((entity) => (
            <Entity key={entity.entity_number} entity={entity} />
          ))}
          {annotations
            .filter((a) => a.kind !== "machine")
            .map((a) => (
              <g key={`${a.kind}-${a.item}`}>
                <circle
                  cx={a.x + 0.5}
                  cy={a.y + 0.5}
                  r=".48"
                  fill="none"
                  stroke={a.kind === "input" ? "#7fcf83" : "#f9b44b"}
                  strokeWidth=".16"
                />
                <title>
                  {a.kind}: {title(a.item)}
                </title>
                <text
                  x={a.x + 0.5}
                  y={a.y - 0.45}
                  textAnchor={a.kind === "input" ? "start" : "end"}
                  fill={a.kind === "input" ? "#7fcf83" : "#f9b44b"}
                  fontSize=".8"
                >
                  {title(a.item)}
                </text>
              </g>
            ))}
        </svg>
      </div>
      <div className="legend">
        <span>
          <i style={{ background: COLORS.machine }} />
          Machines
        </span>
        <span>
          <i style={{ background: COLORS.belt }} />
          Belts & crossings
        </span>
        <span>
          <i style={{ background: COLORS.inserter }} />
          Inserters
        </span>
        <span>
          <i style={{ background: COLORS.pole }} />
          Power
        </span>
      </div>
      <p className="preview-note">
        Inputs enter on the left. Outputs leave on the right. Hover an entity
        for details; zoom and scroll to inspect. The preview and export use the
        same entities.
      </p>
    </>
  );
}
