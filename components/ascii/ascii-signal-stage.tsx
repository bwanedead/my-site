"use client";

import { useEffect, useRef } from "react";
import {
  renderAsciiFrame,
  resizeAsciiCanvas,
  type AsciiMetrics,
} from "./ascii-renderer";
import styles from "./ascii-signal-stage.module.css";

const FRAME_INTERVAL = 1000 / 14;

export function AsciiSignalStage() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;

    if (!stage || !canvas) {
      return;
    }

    const context = canvas.getContext("2d", { alpha: false });

    if (!context) {
      return;
    }

    const pointer = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
    };

    let frame = 0;
    let lastFrameTime = 0;
    let metrics: AsciiMetrics = resizeAsciiCanvas(canvas, stage.getBoundingClientRect());

    const handleResize = () => {
      metrics = resizeAsciiCanvas(canvas, stage.getBoundingClientRect());
    };

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = stage.getBoundingClientRect();

      pointer.targetX = (event.clientX / bounds.width) * 2 - 1;
      pointer.targetY = (event.clientY / bounds.height) * 2 - 1;
    };

    const handlePointerLeave = () => {
      pointer.targetX = 0;
      pointer.targetY = 0;
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(stage);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerleave", handlePointerLeave);
    handleResize();
    renderAsciiFrame(context, metrics, 0, pointer);

    const animate = (timestamp: number) => {
      frame = window.requestAnimationFrame(animate);

      if (timestamp - lastFrameTime < FRAME_INTERVAL) {
        return;
      }

      lastFrameTime = timestamp;
      pointer.x += (pointer.targetX - pointer.x) * 0.05;
      pointer.y += (pointer.targetY - pointer.y) * 0.05;

      renderAsciiFrame(context, metrics, timestamp / 1000, pointer);
    };

    frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  return (
    <div
      ref={stageRef}
      className={styles.stage}
      aria-label="Animated ASCII signal background"
    >
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.beam} aria-hidden="true" />
      <div className={styles.scan} aria-hidden="true" />
      <div className={styles.noise} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />
    </div>
  );
}
