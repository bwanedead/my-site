import "client-only";
import type { AsciiPerformanceSummary } from "./ascii-performance";

export type AsciiLayerName = "main" | "substrate";
export type AsciiLogLevel = "info" | "warn" | "error";

export type AsciiLayerStyleSnapshot = {
  width: number;
  height: number;
  opacity: number;
  display: string;
  visibility: string;
  mixBlendMode: string;
  filter: string;
};

export type AsciiLayerMetricsSnapshot = {
  cols: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  dpr: number;
};

export type AsciiLayerRenderSnapshot = {
  glyphCount: number;
  coverage: number;
  meanAlpha: number;
  peakAlpha: number;
  meanEnergy: number;
  frameMs: number;
  fpsTarget: number;
};

export type AsciiPointerSnapshot = {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
};

export type AsciiStageSnapshot = {
  width: number;
  height: number;
  background: string;
};

export type AsciiLayerSnapshot = {
  name: AsciiLayerName;
  alphaMode: "transparent" | "opaque";
  metrics: AsciiLayerMetricsSnapshot;
  render: AsciiLayerRenderSnapshot;
  style: AsciiLayerStyleSnapshot;
  visibleScore: number;
  warnings: string[];
};

export type AsciiLogEntry = {
  id: number;
  timestamp: string;
  level: AsciiLogLevel;
  scope: string;
  message: string;
};

export type AsciiDiagnosticsSnapshot = {
  updatedAt: number;
  stage: AsciiStageSnapshot | null;
  pointer: AsciiPointerSnapshot;
  performance: AsciiPerformanceSummary | null;
  layers: Partial<Record<AsciiLayerName, AsciiLayerSnapshot>>;
  events: AsciiLogEntry[];
};

type AsciiLayerRecordInput = {
  name: AsciiLayerName;
  alphaMode: "transparent" | "opaque";
  metrics: AsciiLayerMetricsSnapshot;
  render: AsciiLayerRenderSnapshot;
  style: AsciiLayerStyleSnapshot;
  stage: AsciiStageSnapshot;
  pointer: AsciiPointerSnapshot;
};

declare global {
  interface Window {
    __ASCII_DIAGNOSTICS__?: AsciiDiagnosticsSnapshot;
  }
}

const listeners = new Set<() => void>();

let eventId = 0;
let snapshot: AsciiDiagnosticsSnapshot = {
  updatedAt: 0,
  stage: null,
  pointer: {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  },
  performance: null,
  layers: {},
  events: [],
};

export function subscribeAsciiDiagnostics(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getAsciiDiagnosticsSnapshot() {
  return snapshot;
}

export function recordAsciiLayerDiagnostics(input: AsciiLayerRecordInput) {
  const warnings = assessLayerWarnings(input);
  const visibleScore = assessVisibleScore(input, warnings);

  const layerSnapshot: AsciiLayerSnapshot = {
    name: input.name,
    alphaMode: input.alphaMode,
    metrics: input.metrics,
    render: input.render,
    style: input.style,
    visibleScore,
    warnings,
  };

  snapshot = {
    ...snapshot,
    updatedAt: Date.now(),
    stage: input.stage,
    pointer: input.pointer,
    layers: {
      ...snapshot.layers,
      [input.name]: layerSnapshot,
    },
  };

  publishSnapshot();
  return layerSnapshot;
}

export function recordAsciiPerformanceSummary(summary: AsciiPerformanceSummary) {
  snapshot = {
    ...snapshot,
    updatedAt: Date.now(),
    performance: summary,
  };

  publishSnapshot();
}

export function appendAsciiEvent(level: AsciiLogLevel, scope: string, message: string) {
  const entry: AsciiLogEntry = {
    id: ++eventId,
    timestamp: new Date().toLocaleTimeString(),
    level,
    scope,
    message,
  };

  snapshot = {
    ...snapshot,
    events: [entry, ...snapshot.events].slice(0, 14),
  };

  if (typeof window !== "undefined") {
    const fn =
      level === "error" ? console.error : level === "warn" ? console.warn : console.info;
    fn(`[ascii:${scope}] ${message}`);
  }

  publishSnapshot();
}

export function isAsciiDiagnosticsEnabledInBrowser() {
  if (typeof window === "undefined") {
    return false;
  }

  const url = new URL(window.location.href);
  return (
    url.searchParams.get("ascii-debug") === "1" ||
    window.localStorage.getItem("ascii-debug") === "1"
  );
}

export function setAsciiDiagnosticsEnabledInBrowser(enabled: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  if (enabled) {
    window.localStorage.setItem("ascii-debug", "1");
  } else {
    window.localStorage.removeItem("ascii-debug");
  }

  window.dispatchEvent(new CustomEvent("ascii-debug-toggle", { detail: enabled }));
}

function publishSnapshot() {
  if (typeof window !== "undefined") {
    window.__ASCII_DIAGNOSTICS__ = snapshot;
  }

  for (const listener of listeners) {
    listener();
  }
}

function assessLayerWarnings(input: AsciiLayerRecordInput) {
  const warnings: string[] = [];

  if (input.render.glyphCount === 0) {
    warnings.push("no glyphs were painted");
  }

  if (input.render.coverage < 0.05) {
    warnings.push("coverage is sparse");
  }

  if (input.render.meanAlpha < 0.08) {
    warnings.push("average alpha is very low");
  }

  if (input.style.opacity < 0.28) {
    warnings.push("css opacity is very low");
  }

  if (input.style.display === "none" || input.style.visibility === "hidden") {
    warnings.push("layer is hidden by CSS");
  }

  if (input.style.mixBlendMode !== "normal" && input.render.meanAlpha < 0.12) {
    warnings.push("blend mode may swallow dim glyphs");
  }

  if (input.style.filter.includes("blur") && input.render.meanAlpha < 0.11) {
    warnings.push("blur may be softening the layer out of view");
  }

  if (input.name === "main" && input.alphaMode === "opaque") {
    warnings.push("opaque upper canvas will cover lower layers");
  }

  return warnings;
}

function assessVisibleScore(input: AsciiLayerRecordInput, warnings: string[]) {
  const blurPenalty = input.style.filter.includes("blur") ? 0.06 : 0;
  const warningPenalty = warnings.length * 0.05;

  return clamp(
    input.render.coverage * 1.8 +
      input.render.meanAlpha * 2.4 +
      input.render.peakAlpha * 0.55 +
      input.style.opacity * 0.28 -
      blurPenalty -
      warningPenalty,
    0,
    1,
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
