// src/lib/safety/distress.ts — pure loudness logic for the PROTOTYPE distress demo.
// It measures how loud the microphone signal is. It does not recognise screams,
// words or assault, and nothing is recorded or sent anywhere.
export const SENSITIVITY = { low: 20, medium: 15, high: 10 } as const;
export type Sensitivity = keyof typeof SENSITIVITY;

export function rmsOf(samples: ArrayLike<number>): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

/** Level in dB relative to full scale (0 dBFS is the loudest possible). */
export const dbFromRms = (rms: number) => (rms <= 1e-8 ? -100 : 20 * Math.log10(rms));

export function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export interface DetectorResult {
  phase: "calibrating" | "listening";
  threshold: number | null;
  loud: boolean;
  triggered: boolean;
}

/**
 * Learns the room's background level for `calibrationSamples`, then reports a trigger when
 * at least `needed` of the last `windowSize` samples are louder than baseline + offset (never below `floorDb`).
 */
export function createDetector(sensitivity: Sensitivity = "medium", calibrationSamples = 20, windowSize = 10, needed = 6, floorDb = -35) {
  const calib: number[] = [];
  let threshold: number | null = null;
  let window: boolean[] = [];
  return {
    push(db: number): DetectorResult {
      if (threshold === null) {
        calib.push(db);
        if (calib.length >= calibrationSamples) threshold = Math.max(median(calib) + SENSITIVITY[sensitivity], floorDb);
        return { phase: threshold === null ? "calibrating" : "listening", threshold, loud: false, triggered: false };
      }
      const loud = db > threshold;
      window.push(loud);
      if (window.length > windowSize) window = window.slice(-windowSize);
      const triggered = window.filter(Boolean).length >= needed;
      if (triggered) window = [];
      return { phase: "listening", threshold, loud, triggered };
    },
  };
}
