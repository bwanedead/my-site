import type { AsciiFrameStats, AsciiMetrics, PointerSignal } from "./ascii-renderer";

type SeaSample = {
  activity: number;
  shimmer: number;
  warmth: number;
  dirX: number;
  dirY: number;
  curl: number;
  density: number;
};

const QUIET_SEA_GLYPHS = [".", ".", ":", "`", ","];
const WAVE_GLYPHS = ["~", "=", "-", "_"];
const VERTICAL_GLYPHS = ["|", ":", "!", "I"];
const HORIZONTAL_GLYPHS = ["-", "=", "~", "_"];
const DIAGONAL_LEFT_GLYPHS = ["/", "/", "x", "+"];
const DIAGONAL_RIGHT_GLYPHS = ["\\", "\\", "x", "+"];

export function renderAsciiSubstrateFrame(
  ctx: CanvasRenderingContext2D,
  metrics: AsciiMetrics,
  time: number,
  pointer: PointerSignal,
) {
  ctx.setTransform(metrics.dpr, 0, 0, metrics.dpr, 0, 0);
  ctx.clearRect(0, 0, metrics.width, metrics.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `500 ${metrics.fontSize * 0.92}px "IBM Plex Mono", monospace`;

  let glyphCount = 0;
  let alphaTotal = 0;
  let peakAlpha = 0;
  let energyTotal = 0;

  for (let row = 0; row < metrics.rows; row += 1) {
    const y = (row + 0.5) * metrics.cellHeight;
    const ny = row / (metrics.rows - 1);
    const centeredY = ny * 2 - 1;

    for (let col = 0; col < metrics.cols; col += 1) {
      const x = (col + 0.5) * metrics.cellWidth;
      const nx = col / (metrics.cols - 1);
      const centeredX = (nx * 2 - 1) * metrics.aspect;
      const sample = sampleSubstrateField(centeredX, centeredY, time, pointer);
      energyTotal += sample.activity * 0.72 + sample.curl * 0.28;
      const glyph = selectSubstrateGlyph(sample, time);

      if (glyph === " ") {
        continue;
      }

      const alpha = clamp(
        sample.activity * 0.24 + sample.curl * 0.09 + sample.density * 0.08,
        0.055,
        0.34,
      );

      glyphCount += 1;
      alphaTotal += alpha;
      peakAlpha = Math.max(peakAlpha, alpha);
      ctx.fillStyle = sampleSubstrateColor(sample, alpha);
      ctx.fillText(glyph, x, y);
    }
  }

  return {
    glyphCount,
    coverage: glyphCount / (metrics.cols * metrics.rows),
    meanAlpha: glyphCount === 0 ? 0 : alphaTotal / glyphCount,
    peakAlpha,
    meanEnergy: energyTotal / (metrics.cols * metrics.rows),
  } satisfies AsciiFrameStats;
}

function sampleSubstrateField(
  x: number,
  y: number,
  time: number,
  pointer: PointerSignal,
) {
  const flowX =
    Math.sin(x * 2.4 + time * 0.14 + Math.sin(y * 5.2 - time * 0.09) * 0.72) * 0.74 +
    Math.cos(y * 3.8 - time * 0.12 + x * 1.5) * 0.36 +
    pointer.x * 0.18;
  const flowY =
    Math.cos(y * 2.9 - time * 0.13 + Math.cos(x * 4.1 + time * 0.09) * 0.68) * 0.68 +
    Math.sin(x * 4.8 + time * 0.18 - y * 1.4) * 0.28 +
    pointer.y * 0.16;
  const shimmer =
    0.5 +
    0.5 *
      Math.sin(x * 9.4 + y * 2.8 + time * 0.28 + pointer.x * 0.9) *
      Math.cos(y * 8.6 - x * 3.4 - time * 0.23 + pointer.y * 0.8);
  const curl =
    0.5 +
    0.5 *
      Math.sin((x * y) * 16 + time * 0.2 + flowX * 1.7) *
      Math.cos((x - y) * 7.2 - time * 0.19 + flowY * 1.5);
  const density =
    0.5 +
    0.5 *
      Math.sin((x + y) * 4.2 + time * 0.08) *
      Math.cos((x - y) * 3.7 - time * 0.06);
  const activity = clamp(0.22 + shimmer * 0.32 + curl * 0.3 + density * 0.16, 0, 1);
  const warmth = 0.5 + 0.5 * Math.sin(time * 0.1 + x * 2.7 - y * 2.5 + curl * 1.2);
  const magnitude = Math.hypot(flowX, flowY) || 1;

  return {
    activity,
    shimmer,
    warmth,
    dirX: flowX / magnitude,
    dirY: flowY / magnitude,
    curl,
    density,
  } satisfies SeaSample;
}

function selectSubstrateGlyph(sample: SeaSample, time: number) {
  const phase = Math.abs(
    Math.floor(time * 4 + sample.shimmer * 10 + sample.curl * 8 + sample.density * 6),
  );

  if (sample.activity < 0.16) {
    return " ";
  }

  if (sample.activity < 0.3) {
    return QUIET_SEA_GLYPHS[phase % QUIET_SEA_GLYPHS.length];
  }

  const directionX = sample.dirX;
  const directionY = sample.dirY;

  if (Math.abs(directionX) > 0.84) {
    return WAVE_GLYPHS[phase % WAVE_GLYPHS.length];
  }

  if (Math.abs(directionY) > 0.88) {
    return VERTICAL_GLYPHS[phase % VERTICAL_GLYPHS.length];
  }

  if (sample.curl > 0.7) {
    return directionX * directionY > 0
      ? DIAGONAL_RIGHT_GLYPHS[phase % DIAGONAL_RIGHT_GLYPHS.length]
      : DIAGONAL_LEFT_GLYPHS[phase % DIAGONAL_LEFT_GLYPHS.length];
  }

  return HORIZONTAL_GLYPHS[phase % HORIZONTAL_GLYPHS.length];
}

function sampleSubstrateColor(sample: SeaSample, alpha: number) {
  const rust: [number, number, number] = [96, 41, 21];
  const cyan: [number, number, number] = [112, 198, 208];
  const yellow: [number, number, number] = [171, 150, 74];
  const lilac: [number, number, number] = [164, 152, 198];

  let color = mixColor(rust, cyan, clamp(sample.shimmer * 0.68 + sample.density * 0.15, 0, 1));
  color = mixColor(color, yellow, clamp(sample.warmth * 0.24, 0, 0.24));
  color = mixColor(color, lilac, clamp((sample.curl - 0.54) * 0.24, 0, 0.18));

  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}

function mixColor(
  from: [number, number, number],
  to: [number, number, number],
  amount: number,
): [number, number, number] {
  return [
    Math.round(from[0] + (to[0] - from[0]) * amount),
    Math.round(from[1] + (to[1] - from[1]) * amount),
    Math.round(from[2] + (to[2] - from[2]) * amount),
  ];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
