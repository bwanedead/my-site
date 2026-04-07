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

type SignalSample = {
  intensity: number;
  glow: number;
  ring: number;
  spine: number;
  interference: number;
  angle: number;
  radius: number;
  x: number;
  y: number;
};

const QUIET_GLYPHS = [" ", " ", ".", "'", "`", ":"];
const VERTICAL_GLYPHS = ["|", "!", ":", "I"];
const HORIZONTAL_GLYPHS = ["-", "=", "~", "_"];
const DIAGONAL_LEFT_GLYPHS = ["/", "/", "/", "x"];
const DIAGONAL_RIGHT_GLYPHS = ["\\", "\\", "\\", "x"];
const SPARK_GLYPHS = ["+", "*", "x", ":"];
const DENSE_GLYPHS = ["#", "%", "@", "$"];
const ARC_LEFT_GLYPHS = ["(", "{", "[", "<"];
const ARC_RIGHT_GLYPHS = [")", "}", "]", ">"];
const STAR_GLYPHS = [".", "'", "`"];

export function resizeAsciiCanvas(
  canvas: HTMLCanvasElement,
  bounds: Pick<DOMRectReadOnly, "width" | "height">,
) {
  const width = Math.max(320, Math.floor(bounds.width));
  const height = Math.max(320, Math.floor(bounds.height));
  const dpr = Math.min(window.devicePixelRatio || 1, 1.6);

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);

  const targetCellWidth = clamp(width / 90, 10.5, 15.5);
  const cols = Math.max(52, Math.floor(width / targetCellWidth));
  const rows = Math.max(30, Math.floor(height / (targetCellWidth * 1.42)));
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
    fontSize: cellHeight * 0.92,
    aspect: width / height,
  } satisfies AsciiMetrics;
}

export function renderAsciiFrame(
  ctx: CanvasRenderingContext2D,
  metrics: AsciiMetrics,
  time: number,
  pointer: PointerSignal,
) {
  ctx.setTransform(metrics.dpr, 0, 0, metrics.dpr, 0, 0);
  paintBackdrop(ctx, metrics, pointer);

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
      const sample = sampleSignalField(centeredX, centeredY, time, pointer);

      if (sample.intensity < 0.045) {
        paintStarfield(ctx, row, col, x, y, sample, time);
        continue;
      }

      const glyph = selectGlyph(sample, time);

      if (glyph === " ") {
        continue;
      }

      const alpha = clamp(sample.intensity * 1.08 + sample.glow * 0.22, 0.1, 0.98);
      const color = sampleColor(sample, alpha);

      if (sample.glow > 0.32) {
        ctx.shadowBlur = 12 + sample.glow * 24;
        ctx.shadowColor = sampleColor(sample, clamp(alpha * 0.45, 0.16, 0.5));
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = color;
      ctx.fillText(glyph, x, y);
    }
  }

  ctx.shadowBlur = 0;
}

function paintBackdrop(
  ctx: CanvasRenderingContext2D,
  metrics: AsciiMetrics,
  pointer: PointerSignal,
) {
  const gradient = ctx.createRadialGradient(
    metrics.width * (0.5 + pointer.x * 0.03),
    metrics.height * (0.46 + pointer.y * 0.02),
    0,
    metrics.width * 0.5,
    metrics.height * 0.5,
    metrics.width * 0.72,
  );

  gradient.addColorStop(0, "rgb(8 11 19)");
  gradient.addColorStop(0.36, "rgb(3 6 12)");
  gradient.addColorStop(0.72, "rgb(1 2 4)");
  gradient.addColorStop(1, "rgb(0 0 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, metrics.width, metrics.height);
}

function paintStarfield(
  ctx: CanvasRenderingContext2D,
  row: number,
  col: number,
  x: number,
  y: number,
  sample: SignalSample,
  time: number,
) {
  const starSeed = hash2D(col * 1.37, row * 2.11);

  if (starSeed < 0.992) {
    return;
  }

  const twinkle = 0.32 + 0.68 * Math.sin(time * 0.85 + starSeed * 24) ** 2;
  const glyph = STAR_GLYPHS[Math.floor(starSeed * STAR_GLYPHS.length) % STAR_GLYPHS.length];
  const alpha = clamp(0.08 + twinkle * 0.18 - sample.radius * 0.03, 0.05, 0.22);

  ctx.fillStyle = `rgba(130, 155, 214, ${alpha})`;
  ctx.fillText(glyph, x, y);
}

function sampleSignalField(
  x: number,
  y: number,
  time: number,
  pointer: PointerSignal,
) {
  const shiftedX = x - pointer.x * 0.14 + Math.sin(time * 0.22) * 0.05;
  const shiftedY = y - pointer.y * 0.1 + Math.cos(time * 0.18) * 0.04;
  const radius = Math.hypot(shiftedX * 0.88, shiftedY * 1.18);
  const angle = Math.atan2(shiftedY, shiftedX);

  const ringRadius = 0.42 + Math.sin(time * 0.74) * 0.04;
  const ring = Math.exp(-Math.abs(radius - ringRadius) * 18);
  const core = Math.exp(-radius * 7.2);
  const spine =
    Math.exp(
      -Math.abs(
        shiftedX + Math.sin(shiftedY * 5.4 - time * 1.35 + pointer.x * 1.5) * 0.12,
      ) * 11.5,
    ) * (1 - smoothStep(0.18, 1.1, radius));
  const sweep =
    Math.exp(-Math.abs(shiftedY - Math.sin(time * 0.25) * 0.24) * 15) *
    (0.35 + 0.65 * Math.exp(-Math.abs(shiftedX) * 2.5));
  const orbitA = glowPoint(
    shiftedX,
    shiftedY,
    Math.cos(time * 0.78) * 0.42,
    Math.sin(time * 0.66) * 0.18,
    24,
  );
  const orbitB = glowPoint(
    shiftedX,
    shiftedY,
    Math.cos(-time * 0.5 + 1.6) * 0.24,
    Math.sin(time * 0.73 + 2.1) * 0.34,
    34,
  );
  const orbitC =
    glowPoint(
      shiftedX,
      shiftedY,
      Math.sin(time * 0.35 + 0.7) * 0.15,
      Math.cos(time * 0.42 + 1.7) * 0.45,
      28,
    ) * 0.7;
  const interference =
    0.5 +
    0.5 *
      Math.sin(shiftedX * 17 - shiftedY * 11 + time * 1.6) *
      Math.cos(radius * 24 - time * 1.4);
  const lattice =
    0.5 +
    0.5 *
      Math.sin(shiftedX * 9 + time * 0.6) *
      Math.sin(shiftedY * 13 - time * 0.9);
  const cone =
    Math.exp(-Math.abs(shiftedX * 1.25) * 2.8) * (1 - smoothStep(0.08, 1.05, Math.abs(shiftedY)));
  const falloff = 1 - smoothStep(0.72, 1.45, radius);

  let intensity =
    ring * 0.74 +
    core * 0.36 +
    spine * 0.68 +
    orbitA * 0.55 +
    orbitB * 0.34 +
    orbitC * 0.24 +
    interference * ring * 0.18 +
    lattice * 0.14 +
    sweep * 0.18 +
    cone * 0.12;

  intensity = clamp(intensity * falloff, 0, 1);

  return {
    intensity,
    glow: clamp(core * 0.52 + orbitA * 0.95 + orbitB * 0.44 + ring * 0.28, 0, 1),
    ring,
    spine,
    interference,
    angle,
    radius,
    x: shiftedX,
    y: shiftedY,
  } satisfies SignalSample;
}

function selectGlyph(sample: SignalSample, time: number) {
  const phase = Math.abs(
    Math.floor(time * 7 + sample.x * 8 - sample.y * 6 + sample.interference * 5),
  );

  if (sample.glow > 0.88 && sample.intensity > 0.7) {
    return DENSE_GLYPHS[phase % DENSE_GLYPHS.length];
  }

  if (sample.spine > 0.45 && sample.intensity > 0.26) {
    return VERTICAL_GLYPHS[phase % VERTICAL_GLYPHS.length];
  }

  if (sample.ring > 0.42 && sample.intensity > 0.24) {
    return sample.x < 0
      ? ARC_LEFT_GLYPHS[phase % ARC_LEFT_GLYPHS.length]
      : ARC_RIGHT_GLYPHS[phase % ARC_RIGHT_GLYPHS.length];
  }

  if (sample.intensity > 0.44) {
    const warpedAngle =
      sample.angle +
      sample.interference * 0.85 +
      Math.sin(time * 0.75 + sample.radius * 10) * 0.24;
    const directionX = Math.cos(warpedAngle);
    const directionY = Math.sin(warpedAngle);

    if (Math.abs(directionX) > 0.86) {
      return HORIZONTAL_GLYPHS[phase % HORIZONTAL_GLYPHS.length];
    }

    if (Math.abs(directionY) > 0.88) {
      return VERTICAL_GLYPHS[phase % VERTICAL_GLYPHS.length];
    }

    return directionX * directionY > 0
      ? DIAGONAL_RIGHT_GLYPHS[phase % DIAGONAL_RIGHT_GLYPHS.length]
      : DIAGONAL_LEFT_GLYPHS[phase % DIAGONAL_LEFT_GLYPHS.length];
  }

  if (sample.interference > 0.62 && sample.intensity > 0.18) {
    return SPARK_GLYPHS[phase % SPARK_GLYPHS.length];
  }

  return QUIET_GLYPHS[phase % QUIET_GLYPHS.length];
}

function sampleColor(sample: SignalSample, alpha: number) {
  const base: [number, number, number] = [88, 104, 146];
  const cold: [number, number, number] = [104, 164, 255];
  const signal: [number, number, number] = [156, 251, 211];
  const white: [number, number, number] = [245, 249, 255];

  let color = mixColor(base, cold, clamp(sample.intensity * 1.2 + sample.ring * 0.18, 0, 1));
  color = mixColor(color, signal, clamp(sample.glow * 0.82 + sample.spine * 0.14, 0, 1));
  color = mixColor(
    color,
    white,
    clamp((sample.intensity - 0.66) * 2.8 + sample.glow * 0.32, 0, 1),
  );

  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}

function glowPoint(
  x: number,
  y: number,
  originX: number,
  originY: number,
  strength: number,
) {
  return Math.exp(-Math.hypot(x - originX, y - originY) * strength);
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
