export type PointerSignal = {
  x: number;
  y: number;
};

export type AsciiMetrics = {
  width: number;
  height: number;
  dpr: number;
  cols: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  fontSize: number;
  aspect: number;
};

type ResonanceMode = {
  a: number;
  b: number;
  c: number;
  d: number;
  twist: number;
  drift: number;
};

type ResonanceFrame = {
  primary: ResonanceMode;
  secondary: ResonanceMode;
  mix: number;
  time: number;
  pointer: PointerSignal;
};

type ResonanceSample = {
  intensity: number;
  glow: number;
  node: number;
  ridge: number;
  dust: number;
  drift: number;
  ambient: number;
  warmth: number;
  angle: number;
  x: number;
  y: number;
};

const QUIET_GLYPHS = [" ", " ", " ", ".", ".", "`", "'"];
const DUST_GLYPHS = [".", ":", "'", "`", "*"];
const NODE_GLYPHS = ["*", "+", "x", "%", "#", "@"];
const WAVE_GLYPHS = ["~", "=", "-", "_"];
const VERTICAL_GLYPHS = ["|", "!", ":", "I"];
const HORIZONTAL_GLYPHS = ["-", "=", "~", "_"];
const DIAGONAL_LEFT_GLYPHS = ["/", "/", "x", "+"];
const DIAGONAL_RIGHT_GLYPHS = ["\\", "\\", "x", "+"];

const RESONANCE_MODES: ResonanceMode[] = [
  { a: 2, b: 3, c: 5, d: 4, twist: 0.55, drift: 0.18 },
  { a: 3, b: 5, c: 6, d: 2, twist: 0.72, drift: 0.44 },
  { a: 4, b: 6, c: 3, d: 7, twist: 0.96, drift: 0.88 },
  { a: 5, b: 2, c: 7, d: 4, twist: 0.61, drift: 1.3 },
  { a: 6, b: 4, c: 8, d: 3, twist: 1.12, drift: 1.78 },
  { a: 3, b: 7, c: 5, d: 8, twist: 0.83, drift: 2.22 },
];

export function resizeAsciiCanvas(
  canvas: HTMLCanvasElement,
  bounds: Pick<DOMRectReadOnly, "width" | "height">,
) {
  const width = Math.max(320, Math.floor(bounds.width));
  const height = Math.max(320, Math.floor(bounds.height));
  const dpr = Math.min(window.devicePixelRatio || 1, 1.8);

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);

  const targetCellWidth = clamp(width / 160, 5.4, 8.4);
  const cols = Math.max(84, Math.floor(width / targetCellWidth));
  const rows = Math.max(50, Math.floor(height / (targetCellWidth * 1.08)));
  const cellWidth = width / cols;
  const cellHeight = height / rows;

  return {
    width,
    height,
    dpr,
    cols,
    rows,
    cellWidth,
    cellHeight,
    fontSize: cellHeight * 0.78,
    aspect: width / height,
  } satisfies AsciiMetrics;
}

export function renderAsciiFrame(
  ctx: CanvasRenderingContext2D,
  metrics: AsciiMetrics,
  time: number,
  pointer: PointerSignal,
) {
  const frame = createResonanceFrame(time, pointer);

  ctx.setTransform(metrics.dpr, 0, 0, metrics.dpr, 0, 0);
  paintBackdrop(ctx, metrics, frame);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${metrics.fontSize}px "IBM Plex Mono", monospace`;

  for (let row = 0; row < metrics.rows; row += 1) {
    const y = (row + 0.5) * metrics.cellHeight;
    const ny = row / (metrics.rows - 1);
    const centeredY = ny * 2 - 1;

    for (let col = 0; col < metrics.cols; col += 1) {
      const x = (col + 0.5) * metrics.cellWidth;
      const nx = col / (metrics.cols - 1);
      const centeredX = (nx * 2 - 1) * metrics.aspect;
      const sample = sampleResonanceField(centeredX, centeredY, frame);
      const glyph = selectGlyph(sample, time);

      if (glyph === " ") {
        continue;
      }

      const alpha = clamp(sample.intensity * 1.06 + sample.glow * 0.16, 0.06, 0.98);

      if (sample.glow > 0.3) {
        ctx.shadowBlur = 10 + sample.glow * 22;
        ctx.shadowColor = sampleColor(sample, clamp(alpha * 0.42, 0.16, 0.48));
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = sampleColor(sample, alpha);
      ctx.fillText(glyph, x, y);
    }
  }

  ctx.shadowBlur = 0;
}

function createResonanceFrame(time: number, pointer: PointerSignal): ResonanceFrame {
  const cycleLength = 11.5;
  const cycle = time / cycleLength;
  const primaryIndex = Math.floor(cycle) % RESONANCE_MODES.length;
  const secondaryIndex = (primaryIndex + 1) % RESONANCE_MODES.length;
  const mix = smoothStep(0.08, 0.92, cycle - Math.floor(cycle));

  return {
    primary: RESONANCE_MODES[primaryIndex],
    secondary: RESONANCE_MODES[secondaryIndex],
    mix,
    time,
    pointer,
  };
}

function paintBackdrop(
  ctx: CanvasRenderingContext2D,
  metrics: AsciiMetrics,
  frame: ResonanceFrame,
) {
  const gradient = ctx.createRadialGradient(
    metrics.width * (0.5 + frame.pointer.x * 0.04),
    metrics.height * (0.48 + frame.pointer.y * 0.025),
    0,
    metrics.width * 0.5,
    metrics.height * 0.5,
    metrics.width * 0.78,
  );

  gradient.addColorStop(0, "rgb(18 16 10)");
  gradient.addColorStop(0.24, "rgb(7 12 12)");
  gradient.addColorStop(0.48, "rgb(10 7 5)");
  gradient.addColorStop(0.76, "rgb(3 3 3)");
  gradient.addColorStop(1, "rgb(0 0 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, metrics.width, metrics.height);
}

function sampleResonanceField(x: number, y: number, frame: ResonanceFrame) {
  const warpedX =
    x +
    Math.sin(frame.time * 0.34 + y * 8.2) * 0.055 +
    Math.sin(frame.time * 0.12 + x * 3.6) * 0.03 +
    frame.pointer.x * 0.09 * (1 - clamp(Math.abs(y) * 0.42, 0, 0.42));
  const warpedY =
    y +
    Math.cos(frame.time * 0.29 - x * 7.1) * 0.055 +
    Math.sin(frame.time * 0.15 + y * 3.1) * 0.028 +
    frame.pointer.y * 0.08 * (1 - clamp(Math.abs(x) * 0.34, 0, 0.34));

  const field = mixedResonance(warpedX, warpedY, frame);
  const epsilon = 0.014;
  const deltaX =
    mixedResonance(warpedX + epsilon, warpedY, frame) -
    mixedResonance(warpedX - epsilon, warpedY, frame);
  const deltaY =
    mixedResonance(warpedX, warpedY + epsilon, frame) -
    mixedResonance(warpedX, warpedY - epsilon, frame);

  const gradientMagnitude = clamp(Math.hypot(deltaX, deltaY) * 0.42, 0, 1);
  const node = Math.exp(-Math.abs(field) * 18);
  const ridge = clamp(node * (0.4 + gradientMagnitude * 1.1), 0, 1);
  const dust = hash2D(warpedX * 142 + frame.time * 0.2, warpedY * 128 - frame.time * 0.17);
  const drift =
    0.5 +
    0.5 * Math.sin((warpedX * warpedY) * 18 + frame.time * 0.82 + field * 7.4);
  const ambient =
    0.5 +
    0.5 *
      Math.sin(warpedX * 10.8 + frame.time * 0.15 + field * 2.2) *
      Math.cos(warpedY * 12.2 - frame.time * 0.18);
  const warmth =
    0.5 + 0.5 * Math.sin(frame.time * 0.18 + warpedX * 5.3 - warpedY * 3.4 + field * 2.1);
  const falloff = 1 - smoothStep(1.08, 1.95, Math.hypot(warpedX * 0.84, warpedY * 1.06));

  let intensity =
    ridge * 0.94 +
    node * (0.16 + dust * 0.18) +
    drift * node * 0.1 +
    smoothStep(0.88, 1, dust) * node * 0.18 +
    ambient * 0.026;

  intensity = clamp(intensity * (falloff * 0.94 + 0.06), 0, 1);

  return {
    intensity,
    glow: clamp(node * 0.36 + gradientMagnitude * 0.22 + drift * node * 0.12, 0, 1),
    node,
    ridge,
    dust,
    drift,
    ambient,
    warmth,
    angle: Math.atan2(deltaY, deltaX),
    x: warpedX,
    y: warpedY,
  } satisfies ResonanceSample;
}

function mixedResonance(x: number, y: number, frame: ResonanceFrame) {
  return mixValue(
    resonanceValue(x, y, frame.primary, frame.time),
    resonanceValue(x, y, frame.secondary, frame.time),
    frame.mix,
  );
}

function resonanceValue(x: number, y: number, mode: ResonanceMode, time: number) {
  const px = (x + 1.2) / 2.4;
  const py = (y + 1.2) / 2.4;
  const phase = time * 0.22 + mode.drift;

  const sx =
    Math.sin(mode.a * Math.PI * px + Math.sin(phase + py * 4.2) * 0.22) *
    Math.sin(mode.b * Math.PI * py - Math.cos(phase * 1.08 + px * 4.8) * 0.18);
  const cx =
    Math.cos(mode.c * Math.PI * px - mode.twist * y + Math.sin(phase * 0.76) * 0.16) *
    Math.cos(mode.d * Math.PI * py + mode.twist * x + Math.cos(phase * 0.64) * 0.14);
  const coupling =
    Math.sin((mode.a + mode.d) * px * Math.PI + y * mode.twist) *
    Math.cos((mode.b + mode.c) * py * Math.PI - x * mode.twist);

  return sx - cx * 0.78 + coupling * 0.22;
}

function selectGlyph(sample: ResonanceSample, time: number) {
  const phase = Math.abs(
    Math.floor(time * 5 + sample.x * 11 - sample.y * 9 + sample.drift * 6),
  );

  if (sample.intensity < 0.04) {
    if (sample.dust > 0.992) {
      return DUST_GLYPHS[phase % DUST_GLYPHS.length];
    }

    if (sample.ambient > 0.66) {
      return QUIET_GLYPHS[phase % QUIET_GLYPHS.length];
    }

    return " ";
  }

  if (sample.ridge > 0.82 && sample.node > 0.52) {
    return NODE_GLYPHS[phase % NODE_GLYPHS.length];
  }

  if (sample.node > 0.56) {
    const directionX = Math.cos(sample.angle);
    const directionY = Math.sin(sample.angle);

    if (Math.abs(directionX) > 0.86) {
      return HORIZONTAL_GLYPHS[phase % HORIZONTAL_GLYPHS.length];
    }

    if (Math.abs(directionY) > 0.86) {
      return VERTICAL_GLYPHS[phase % VERTICAL_GLYPHS.length];
    }

    return directionX * directionY > 0
      ? DIAGONAL_RIGHT_GLYPHS[phase % DIAGONAL_RIGHT_GLYPHS.length]
      : DIAGONAL_LEFT_GLYPHS[phase % DIAGONAL_LEFT_GLYPHS.length];
  }

  if (sample.drift > 0.6 && sample.intensity > 0.2) {
    return WAVE_GLYPHS[phase % WAVE_GLYPHS.length];
  }

  if (sample.dust > 0.76 || sample.ambient > 0.72) {
    return DUST_GLYPHS[phase % DUST_GLYPHS.length];
  }

  return QUIET_GLYPHS[phase % QUIET_GLYPHS.length];
}

function sampleColor(sample: ResonanceSample, alpha: number) {
  const rust: [number, number, number] = [112, 47, 20];
  const cyan: [number, number, number] = [110, 246, 255];
  const yellow: [number, number, number] = [247, 213, 82];
  const lilac: [number, number, number] = [212, 199, 255];
  const mint: [number, number, number] = [188, 247, 214];
  const white: [number, number, number] = [252, 247, 231];

  let color = mixColor(rust, cyan, clamp(sample.ridge * 0.7 + sample.drift * 0.18, 0, 1));
  color = mixColor(color, yellow, clamp(sample.node * 0.66 + sample.warmth * 0.22, 0, 1));
  color = mixColor(color, lilac, clamp((sample.drift - 0.58) * 0.28, 0, 0.22));
  color = mixColor(color, mint, clamp((sample.dust - 0.78) * 0.22, 0, 0.16));
  color = mixColor(
    color,
    white,
    clamp((sample.intensity - 0.74) * 2.4 + sample.glow * 0.22, 0, 1),
  );

  const boostedAlpha = clamp(alpha + sample.ambient * 0.028, 0.04, 0.98);

  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${boostedAlpha})`;
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

function mixValue(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}

function smoothStep(min: number, max: number, value: number) {
  const t = clamp((value - min) / (max - min), 0, 1);
  return t * t * (3 - 2 * t);
}

function hash2D(x: number, y: number) {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
