import type { VitalsTick } from "@drunk-buddy/shared";

// Vitals are a SIMULATED feed behind an interface (brief §6). There is no live
// WHOOP HR stream — do not write code that assumes one. Phase 3 implements
// SimulatedVitals (driven from an operator panel / keypress) here; Phase 1 just
// needs the shape + a normal tick for the get_vitals stub.
export type VitalsTickHandler = (tick: VitalsTick) => void;

export interface VitalsSource {
  subscribe(phone: string, onTick: VitalsTickHandler): () => void;
}

export function normalTick(): VitalsTick {
  return { ts: Date.now(), hr: 78, hrv: 55, motion: 1 };
}
