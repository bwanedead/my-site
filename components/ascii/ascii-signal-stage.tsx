"use client";

import { useEffect, useRef } from "react";
import {
  type AsciiFrameStats,
  renderAsciiFrame,
  resizeAsciiCanvas,
  type AsciiMetrics,
} from "./ascii-renderer";
import {
  chooseInitialAsciiRuntimeConfig,
  createAsciiPerformanceController,
  type AsciiRuntimeConfig,
} from "./ascii-performance";
import { renderAsciiSubstrateFrame } from "./ascii-substrate-renderer";
import {
  appendAsciiEvent,
  recordAsciiLayerDiagnostics,
  recordAsciiPerformanceSummary,
  type AsciiLayerName,
  type AsciiLayerStyleSnapshot,
} from "./ascii-observability";
import styles from "./ascii-signal-stage.module.css";

const EMPTY_FRAME_STATS: AsciiFrameStats = {
  glyphCount: 0,
  coverage: 0,
  meanAlpha: 0,
  peakAlpha: 0,
  meanEnergy: 0,
};

export function AsciiSignalStage() {
  const stageRef = useRef<HTMLDivElement>(null);
  const substrateCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const substrateCanvas = substrateCanvasRef.current;
    const canvas = canvasRef.current;

    if (!stage || !substrateCanvas || !canvas) {
      appendAsciiEvent("error", "stage", "stage or canvas nodes were unavailable");
      return;
    }

    const substrateContext = substrateCanvas.getContext("2d", { alpha: true });
    const context = canvas.getContext("2d", { alpha: true });

    if (!context || !substrateContext) {
      appendAsciiEvent("error", "stage", "unable to acquire 2D canvas contexts");
      return;
    }

    const stageElement = stage;
    const substrateCanvasElement = substrateCanvas;
    const canvasElement = canvas;
    const stageBounds = stageElement.getBoundingClientRect();
    const performanceController = createAsciiPerformanceController(
      chooseInitialAsciiRuntimeConfig({
        width: stageBounds.width,
        height: stageBounds.height,
        devicePixelRatio: window.devicePixelRatio || 1,
        hardwareConcurrency: navigator.hardwareConcurrency || 4,
      }),
    );
    let runtimeConfig: AsciiRuntimeConfig = performanceController.getConfig();

    appendAsciiEvent("info", "stage", "ASCII stage mounted");
    appendAsciiEvent(
      "info",
      "performance",
      `profile ${runtimeConfig.tier} selected for ${runtimeConfig.deviceClass} device`,
    );

    const pointer = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
    };

    let frame = 0;
    let lastMainFrameTime = 0;
    let lastSubstrateFrameTime = 0;
    let lastDiagnosticsTime = 0;
    let mainFrameMs = 0;
    let substrateFrameMs = 0;
    let mainStats: AsciiFrameStats = EMPTY_FRAME_STATS;
    let substrateStats: AsciiFrameStats = EMPTY_FRAME_STATS;
    let substrateMetrics: AsciiMetrics = resizeAsciiCanvas(
      substrateCanvasElement,
      stageBounds,
      {
        densityScale: runtimeConfig.substrate.densityScale,
        dprCap: runtimeConfig.substrate.dprCap,
      },
    );
    let metrics: AsciiMetrics = resizeAsciiCanvas(
      canvasElement,
      stageBounds,
      {
        densityScale: runtimeConfig.main.densityScale,
        dprCap: runtimeConfig.main.dprCap,
      },
    );
    const warningKeys: Record<AsciiLayerName, string> = {
      main: "",
      substrate: "",
    };

    const handleResize = () => {
      const bounds = stageElement.getBoundingClientRect();

      substrateMetrics = resizeAsciiCanvas(substrateCanvasElement, bounds, {
        densityScale: runtimeConfig.substrate.densityScale,
        dprCap: runtimeConfig.substrate.dprCap,
      });
      metrics = resizeAsciiCanvas(canvasElement, bounds, {
        densityScale: runtimeConfig.main.densityScale,
        dprCap: runtimeConfig.main.dprCap,
      });
      appendAsciiEvent(
        "info",
        "stage",
        `resize ${runtimeConfig.tier}: main ${metrics.cols}x${metrics.rows}, substrate ${substrateMetrics.cols}x${substrateMetrics.rows}`,
      );
    };

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = stageElement.getBoundingClientRect();

      pointer.targetX = (event.clientX / bounds.width) * 2 - 1;
      pointer.targetY = (event.clientY / bounds.height) * 2 - 1;
    };

    const handlePointerLeave = () => {
      pointer.targetX = 0;
      pointer.targetY = 0;
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(stageElement);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerleave", handlePointerLeave);
    handleResize();
    let startedAt = performance.now();
    substrateStats = renderAsciiSubstrateFrame(substrateContext, substrateMetrics, 0, pointer);
    substrateFrameMs = performance.now() - startedAt;
    startedAt = performance.now();
    mainStats = renderAsciiFrame(context, metrics, 0, pointer);
    mainFrameMs = performance.now() - startedAt;
    performanceController.recordFrame("substrate", 0, substrateFrameMs);
    performanceController.recordFrame("main", 0, mainFrameMs);
    publishDiagnostics();

    const animate = (timestamp: number) => {
      frame = window.requestAnimationFrame(animate);
      pointer.x += (pointer.targetX - pointer.x) * 0.05;
      pointer.y += (pointer.targetY - pointer.y) * 0.05;

      if (timestamp - lastSubstrateFrameTime >= runtimeConfig.substrate.frameIntervalMs) {
        lastSubstrateFrameTime = timestamp;
        const startedAt = performance.now();
        substrateStats = renderAsciiSubstrateFrame(
          substrateContext,
          substrateMetrics,
          timestamp / 1000,
          pointer,
        );
        substrateFrameMs = performance.now() - startedAt;
        performanceController.recordFrame("substrate", timestamp, substrateFrameMs);
      }

      if (timestamp - lastMainFrameTime >= runtimeConfig.main.frameIntervalMs) {
        lastMainFrameTime = timestamp;
        const startedAt = performance.now();
        mainStats = renderAsciiFrame(context, metrics, timestamp / 1000, pointer);
        mainFrameMs = performance.now() - startedAt;
        performanceController.recordFrame("main", timestamp, mainFrameMs);
      }

      if (timestamp - lastDiagnosticsTime >= runtimeConfig.diagnosticsIntervalMs) {
        lastDiagnosticsTime = timestamp;
        publishDiagnostics();

        const adaptation = performanceController.maybeAdapt(timestamp);

        if (adaptation) {
          runtimeConfig = adaptation.config;
          handleResize();
          appendAsciiEvent(
            "warn",
            "performance",
            `downgraded to ${runtimeConfig.tier}: ${adaptation.reason}`,
          );
        }
      }
    };

    frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      appendAsciiEvent("info", "stage", "ASCII stage unmounted");
    };

    function publishDiagnostics() {
      const bounds = stageElement.getBoundingClientRect();
      const stageStyle = window.getComputedStyle(stageElement);
      const performanceSummary = performanceController.getSummary();
      const stageSnapshot = {
        width: Math.round(bounds.width),
        height: Math.round(bounds.height),
        background: stageStyle.backgroundImage || stageStyle.backgroundColor,
      };
      const pointerSnapshot = {
        x: round(pointer.x),
        y: round(pointer.y),
        targetX: round(pointer.targetX),
        targetY: round(pointer.targetY),
      };

      const substrateLayer = recordAsciiLayerDiagnostics({
        name: "substrate",
        alphaMode: "transparent",
        metrics: toMetricsSnapshot(substrateMetrics),
        render: {
          ...substrateStats,
          frameMs: substrateFrameMs,
          fpsTarget: Math.round(1000 / runtimeConfig.substrate.frameIntervalMs),
        },
        style: readCanvasStyle(substrateCanvasElement),
        stage: stageSnapshot,
        pointer: pointerSnapshot,
      });

      const mainLayer = recordAsciiLayerDiagnostics({
        name: "main",
        alphaMode: "transparent",
        metrics: toMetricsSnapshot(metrics),
        render: {
          ...mainStats,
          frameMs: mainFrameMs,
          fpsTarget: Math.round(1000 / runtimeConfig.main.frameIntervalMs),
        },
        style: readCanvasStyle(canvasElement),
        stage: stageSnapshot,
        pointer: pointerSnapshot,
      });

      recordAsciiPerformanceSummary(performanceSummary);
      syncWarnings("substrate", substrateLayer.warnings);
      syncWarnings("main", mainLayer.warnings);
    }

    function syncWarnings(name: AsciiLayerName, warnings: string[]) {
      const nextKey = warnings.join("|");

      if (warningKeys[name] === nextKey) {
        return;
      }

      if (warnings.length > 0) {
        appendAsciiEvent("warn", name, warnings.join("; "));
      } else if (warningKeys[name]) {
        appendAsciiEvent("info", name, "visibility warnings cleared");
      }

      warningKeys[name] = nextKey;
    }
  }, []);

  return (
    <div
      ref={stageRef}
      className={styles.stage}
      aria-label="Animated ASCII signal background"
    >
      <canvas
        ref={substrateCanvasRef}
        className={styles.substrateCanvas}
        aria-hidden="true"
      />
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.beam} aria-hidden="true" />
      <div className={styles.scan} aria-hidden="true" />
      <div className={styles.noise} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />
    </div>
  );
}

function readCanvasStyle(canvas: HTMLCanvasElement): AsciiLayerStyleSnapshot {
  const style = window.getComputedStyle(canvas);

  return {
    width: Math.round(canvas.clientWidth),
    height: Math.round(canvas.clientHeight),
    opacity: Number.parseFloat(style.opacity || "1"),
    display: style.display,
    visibility: style.visibility,
    mixBlendMode: style.mixBlendMode,
    filter: style.filter,
  };
}

function toMetricsSnapshot(metrics: AsciiMetrics) {
  return {
    cols: metrics.cols,
    rows: metrics.rows,
    cellWidth: round(metrics.cellWidth),
    cellHeight: round(metrics.cellHeight),
    dpr: round(metrics.dpr),
  };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
