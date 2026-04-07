"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  getAsciiDiagnosticsSnapshot,
  isAsciiDiagnosticsEnabledInBrowser,
  setAsciiDiagnosticsEnabledInBrowser,
  subscribeAsciiDiagnostics,
} from "./ascii-observability";
import styles from "./ascii-diagnostics-panel.module.css";

const LAYER_ORDER = ["substrate", "main"] as const;

export function AsciiDiagnosticsPanel() {
  const snapshot = useSyncExternalStore(
    subscribeAsciiDiagnostics,
    getAsciiDiagnosticsSnapshot,
    getAsciiDiagnosticsSnapshot,
  );
  const [enabled, setEnabled] = useState(() => isAsciiDiagnosticsEnabledInBrowser());

  useEffect(() => {
    const handleToggle = (event: KeyboardEvent) => {
      if (!(event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "d")) {
        return;
      }

      event.preventDefault();
      const next = !isAsciiDiagnosticsEnabledInBrowser();
      setAsciiDiagnosticsEnabledInBrowser(next);
      setEnabled(next);
    };

    const handleExternalToggle = () => {
      setEnabled(isAsciiDiagnosticsEnabledInBrowser());
    };

    window.addEventListener("keydown", handleToggle);
    window.addEventListener("ascii-debug-toggle", handleExternalToggle as EventListener);

    return () => {
      window.removeEventListener("keydown", handleToggle);
      window.removeEventListener("ascii-debug-toggle", handleExternalToggle as EventListener);
    };
  }, []);

  const updatedAt = useMemo(() => {
    if (!snapshot.updatedAt) {
      return "waiting";
    }

    return new Date(snapshot.updatedAt).toLocaleTimeString();
  }, [snapshot.updatedAt]);

  if (!enabled) {
    return null;
  }

  return (
    <aside className={styles.panel} aria-label="ASCII diagnostics panel">
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>ASCII DIAGNOSTICS</p>
          <p className={styles.subhead}>Ctrl+Shift+D toggles this panel</p>
        </div>
        <button
          type="button"
          className={styles.closeButton}
          onClick={() => {
            setAsciiDiagnosticsEnabledInBrowser(false);
            setEnabled(false);
          }}
        >
          HIDE
        </button>
      </div>

      <dl className={styles.metaGrid}>
        <div>
          <dt>updated</dt>
          <dd>{updatedAt}</dd>
        </div>
        <div>
          <dt>stage</dt>
          <dd>
            {snapshot.stage ? `${snapshot.stage.width}x${snapshot.stage.height}` : "unmounted"}
          </dd>
        </div>
        <div>
          <dt>pointer</dt>
          <dd>
            {snapshot.pointer.x.toFixed(2)} / {snapshot.pointer.y.toFixed(2)}
          </dd>
        </div>
        <div>
          <dt>target</dt>
          <dd>
            {snapshot.pointer.targetX.toFixed(2)} / {snapshot.pointer.targetY.toFixed(2)}
          </dd>
        </div>
      </dl>

      <section className={styles.summaryCard}>
        <p className={styles.logHeading}>runtime</p>
        {snapshot.performance ? (
          <dl className={styles.metricList}>
            <div>
              <dt>tier</dt>
              <dd>{snapshot.performance.tier}</dd>
            </div>
            <div>
              <dt>device</dt>
              <dd>{snapshot.performance.deviceClass}</dd>
            </div>
            <div>
              <dt>avg total</dt>
              <dd>{snapshot.performance.totalAvgFrameMs.toFixed(2)}ms</dd>
            </div>
            <div>
              <dt>peak total</dt>
              <dd>{snapshot.performance.totalPeakFrameMs.toFixed(2)}ms</dd>
            </div>
            <div>
              <dt>adaptations</dt>
              <dd>{snapshot.performance.adaptationCount}</dd>
            </div>
          </dl>
        ) : (
          <p className={styles.emptyState}>no runtime summary yet</p>
        )}
      </section>

      <div className={styles.layers}>
        {LAYER_ORDER.map((name) => {
          const layer = snapshot.layers[name];

          if (!layer) {
            return (
              <section key={name} className={styles.layerCard}>
                <p className={styles.layerName}>{name}</p>
                <p className={styles.emptyState}>no data yet</p>
              </section>
            );
          }

          return (
            <section key={layer.name} className={styles.layerCard}>
              <div className={styles.layerHeader}>
                <p className={styles.layerName}>{layer.name}</p>
                <p className={styles.score}>{Math.round(layer.visibleScore * 100)}% visible</p>
              </div>

              <dl className={styles.metricList}>
                <div>
                  <dt>grid</dt>
                  <dd>
                    {layer.metrics.cols} x {layer.metrics.rows}
                  </dd>
                </div>
                <div>
                  <dt>glyphs</dt>
                  <dd>{layer.render.glyphCount}</dd>
                </div>
                <div>
                  <dt>coverage</dt>
                  <dd>{(layer.render.coverage * 100).toFixed(1)}%</dd>
                </div>
                <div>
                  <dt>alpha</dt>
                  <dd>{layer.render.meanAlpha.toFixed(3)}</dd>
                </div>
                <div>
                  <dt>peak</dt>
                  <dd>{layer.render.peakAlpha.toFixed(3)}</dd>
                </div>
                <div>
                  <dt>frame</dt>
                  <dd>
                    {layer.render.frameMs.toFixed(2)}ms @ {layer.render.fpsTarget}fps
                  </dd>
                </div>
                <div>
                  <dt>actual fps</dt>
                  <dd>
                    {snapshot.performance
                      ? snapshot.performance[name].actualFps.toFixed(1)
                      : "0.0"}
                  </dd>
                </div>
                <div>
                  <dt>avg frame</dt>
                  <dd>
                    {snapshot.performance
                      ? snapshot.performance[name].avgFrameMs.toFixed(2)
                      : "0.00"}
                    ms
                  </dd>
                </div>
                <div>
                  <dt>peak frame</dt>
                  <dd>
                    {snapshot.performance
                      ? snapshot.performance[name].peakFrameMs.toFixed(2)
                      : "0.00"}
                    ms
                  </dd>
                </div>
                <div>
                  <dt>budget hit</dt>
                  <dd>
                    {snapshot.performance
                      ? `${(snapshot.performance[name].overBudgetRatio * 100).toFixed(0)}%`
                      : "0%"}
                  </dd>
                </div>
                <div>
                  <dt>opacity</dt>
                  <dd>{layer.style.opacity.toFixed(2)}</dd>
                </div>
                <div>
                  <dt>blend</dt>
                  <dd>{layer.style.mixBlendMode}</dd>
                </div>
                <div>
                  <dt>alpha mode</dt>
                  <dd>{layer.alphaMode}</dd>
                </div>
              </dl>

              {layer.warnings.length > 0 ? (
                <ul className={styles.warningList}>
                  {layer.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : (
                <p className={styles.okState}>no visibility warnings</p>
              )}
            </section>
          );
        })}
      </div>

      <section className={styles.logCard}>
        <p className={styles.logHeading}>events</p>
        <ul className={styles.logList}>
          {snapshot.events.length > 0 ? (
            snapshot.events.map((event) => (
              <li key={event.id} className={styles.logItem}>
                <span>[{event.timestamp}]</span>
                <span>{event.level}</span>
                <span>{event.scope}</span>
                <span>{event.message}</span>
              </li>
            ))
          ) : (
            <li className={styles.logItem}>no events yet</li>
          )}
        </ul>
      </section>
    </aside>
  );
}
