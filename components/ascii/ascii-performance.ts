import "client-only";

export type AsciiLayerName = "main" | "substrate";
export type AsciiPerformanceTier = "cinematic" | "balanced" | "efficient";

export type AsciiLayerRuntimeConfig = {
  densityScale: number;
  dprCap: number;
  frameIntervalMs: number;
  renderBudgetMs: number;
};

export type AsciiRuntimeConfig = {
  tier: AsciiPerformanceTier;
  deviceClass: string;
  diagnosticsIntervalMs: number;
  main: AsciiLayerRuntimeConfig;
  substrate: AsciiLayerRuntimeConfig;
};

export type AsciiLayerPerformanceSummary = {
  samples: number;
  avgFrameMs: number;
  peakFrameMs: number;
  actualFps: number;
  overBudgetRatio: number;
  budgetMs: number;
};

export type AsciiPerformanceSummary = {
  tier: AsciiPerformanceTier;
  deviceClass: string;
  adaptationCount: number;
  totalAvgFrameMs: number;
  totalPeakFrameMs: number;
  main: AsciiLayerPerformanceSummary;
  substrate: AsciiLayerPerformanceSummary;
};

type DeviceProfileInput = {
  width: number;
  height: number;
  devicePixelRatio: number;
  hardwareConcurrency: number;
};

type LayerSample = {
  frameMs: number;
  deltaMs: number;
  overBudget: boolean;
};

type LayerState = {
  samples: LayerSample[];
  lastTimestamp: number | null;
};

const HISTORY_LIMIT = 72;
const ADAPTATION_COOLDOWN_MS = 5000;

const PROFILES: Record<
  AsciiPerformanceTier,
  Omit<AsciiRuntimeConfig, "tier" | "deviceClass">
> = {
  cinematic: {
    diagnosticsIntervalMs: 1000,
    main: {
      densityScale: 0.96,
      dprCap: 1.15,
      frameIntervalMs: 1000 / 14,
      renderBudgetMs: 8,
    },
    substrate: {
      densityScale: 0.72,
      dprCap: 0.92,
      frameIntervalMs: 1000 / 8,
      renderBudgetMs: 5.4,
    },
  },
  balanced: {
    diagnosticsIntervalMs: 1000,
    main: {
      densityScale: 0.88,
      dprCap: 1.05,
      frameIntervalMs: 1000 / 12,
      renderBudgetMs: 6.8,
    },
    substrate: {
      densityScale: 0.62,
      dprCap: 0.86,
      frameIntervalMs: 1000 / 7,
      renderBudgetMs: 4.8,
    },
  },
  efficient: {
    diagnosticsIntervalMs: 1000,
    main: {
      densityScale: 0.8,
      dprCap: 1,
      frameIntervalMs: 1000 / 10,
      renderBudgetMs: 5.8,
    },
    substrate: {
      densityScale: 0.56,
      dprCap: 0.8,
      frameIntervalMs: 1000 / 6,
      renderBudgetMs: 4,
    },
  },
};

export function chooseInitialAsciiRuntimeConfig(input: DeviceProfileInput): AsciiRuntimeConfig {
  const pixelLoad =
    input.width * input.height * Math.max(1, input.devicePixelRatio * input.devicePixelRatio);
  const lowCoreCount = input.hardwareConcurrency > 0 && input.hardwareConcurrency <= 4;
  const mediumCoreCount = input.hardwareConcurrency > 0 && input.hardwareConcurrency <= 8;

  if (lowCoreCount || pixelLoad > 4_600_000) {
    return buildConfig("efficient", classifyDevice(pixelLoad, input.hardwareConcurrency));
  }

  if (mediumCoreCount || pixelLoad > 2_900_000) {
    return buildConfig("balanced", classifyDevice(pixelLoad, input.hardwareConcurrency));
  }

  return buildConfig("cinematic", classifyDevice(pixelLoad, input.hardwareConcurrency));
}

export function createAsciiPerformanceController(initialConfig: AsciiRuntimeConfig) {
  let config = initialConfig;
  let adaptationCount = 0;
  let lastAdaptationAt = 0;
  const state: Record<AsciiLayerName, LayerState> = {
    main: createLayerState(),
    substrate: createLayerState(),
  };

  return {
    getConfig() {
      return config;
    },

    recordFrame(layer: AsciiLayerName, timestamp: number, frameMs: number) {
      recordLayerSample(state[layer], timestamp, frameMs, config[layer]);
    },

    getSummary(): AsciiPerformanceSummary {
      const main = summarizeLayer(state.main, config.main);
      const substrate = summarizeLayer(state.substrate, config.substrate);

      return {
        tier: config.tier,
        deviceClass: config.deviceClass,
        adaptationCount,
        totalAvgFrameMs: round(main.avgFrameMs + substrate.avgFrameMs),
        totalPeakFrameMs: round(main.peakFrameMs + substrate.peakFrameMs),
        main,
        substrate,
      };
    },

    maybeAdapt(timestamp: number) {
      if (timestamp - lastAdaptationAt < ADAPTATION_COOLDOWN_MS) {
        return null;
      }

      const summary = this.getSummary();
      const nextTier = pickNextTier(config.tier, summary);

      if (!nextTier || nextTier === config.tier) {
        return null;
      }

      adaptationCount += 1;
      lastAdaptationAt = timestamp;
      config = buildConfig(nextTier, config.deviceClass);
      resetLayerState(state.main);
      resetLayerState(state.substrate);

      return {
        config,
        summary,
        reason: buildAdaptationReason(summary),
      };
    },
  };
}

function buildConfig(tier: AsciiPerformanceTier, deviceClass: string): AsciiRuntimeConfig {
  return {
    tier,
    deviceClass,
    diagnosticsIntervalMs: PROFILES[tier].diagnosticsIntervalMs,
    main: { ...PROFILES[tier].main },
    substrate: { ...PROFILES[tier].substrate },
  };
}

function createLayerState(): LayerState {
  return {
    samples: [],
    lastTimestamp: null,
  };
}

function recordLayerSample(
  state: LayerState,
  timestamp: number,
  frameMs: number,
  config: AsciiLayerRuntimeConfig,
) {
  const deltaMs = state.lastTimestamp === null ? config.frameIntervalMs : timestamp - state.lastTimestamp;

  state.lastTimestamp = timestamp;
  state.samples.push({
    frameMs,
    deltaMs,
    overBudget: frameMs > config.renderBudgetMs,
  });

  if (state.samples.length > HISTORY_LIMIT) {
    state.samples.shift();
  }
}

function summarizeLayer(
  state: LayerState,
  config: AsciiLayerRuntimeConfig,
): AsciiLayerPerformanceSummary {
  if (state.samples.length === 0) {
    return {
      samples: 0,
      avgFrameMs: 0,
      peakFrameMs: 0,
      actualFps: 0,
      overBudgetRatio: 0,
      budgetMs: config.renderBudgetMs,
    };
  }

  let frameTotal = 0;
  let deltaTotal = 0;
  let peakFrameMs = 0;
  let overBudgetCount = 0;

  for (const sample of state.samples) {
    frameTotal += sample.frameMs;
    deltaTotal += sample.deltaMs;
    peakFrameMs = Math.max(peakFrameMs, sample.frameMs);
    overBudgetCount += sample.overBudget ? 1 : 0;
  }

  const averageDelta = deltaTotal / state.samples.length;

  return {
    samples: state.samples.length,
    avgFrameMs: round(frameTotal / state.samples.length),
    peakFrameMs: round(peakFrameMs),
    actualFps: averageDelta > 0 ? round(1000 / averageDelta) : 0,
    overBudgetRatio: round(overBudgetCount / state.samples.length),
    budgetMs: config.renderBudgetMs,
  };
}

function resetLayerState(state: LayerState) {
  state.samples = [];
  state.lastTimestamp = null;
}

function pickNextTier(
  currentTier: AsciiPerformanceTier,
  summary: AsciiPerformanceSummary,
) {
  if (currentTier === "efficient") {
    return null;
  }

  const heavyMain =
    summary.main.avgFrameMs > summary.main.budgetMs ||
    summary.main.overBudgetRatio > 0.28 ||
    summary.main.peakFrameMs > summary.main.budgetMs * 2.2;
  const heavySubstrate =
    summary.substrate.avgFrameMs > summary.substrate.budgetMs ||
    summary.substrate.overBudgetRatio > 0.34 ||
    summary.substrate.peakFrameMs > summary.substrate.budgetMs * 2.2;
  const heavyCombined = summary.totalAvgFrameMs > 11.5;

  if (heavyMain || heavySubstrate || heavyCombined) {
    return currentTier === "cinematic" ? "balanced" : "efficient";
  }

  return null;
}

function buildAdaptationReason(summary: AsciiPerformanceSummary) {
  return [
    `total avg ${summary.totalAvgFrameMs.toFixed(2)}ms`,
    `main ${summary.main.avgFrameMs.toFixed(2)}ms/${summary.main.budgetMs.toFixed(1)}ms`,
    `substrate ${summary.substrate.avgFrameMs.toFixed(2)}ms/${summary.substrate.budgetMs.toFixed(1)}ms`,
  ].join(", ");
}

function classifyDevice(pixelLoad: number, hardwareConcurrency: number) {
  if (hardwareConcurrency <= 4 || pixelLoad > 4_600_000) {
    return "constrained";
  }

  if (hardwareConcurrency <= 8 || pixelLoad > 2_900_000) {
    return "balanced";
  }

  return "headroom";
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
