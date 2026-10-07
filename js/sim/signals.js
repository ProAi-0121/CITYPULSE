import { state } from "../state.js";
import {
  signalCount,
  signalGreen,
  signalYellow,
  adaptiveMinGreen,
  adaptiveMaxGreen,
  adaptiveRange
} from "../config.js";
import { drawSignalView } from "../render/signals.js";

export function groupOf(bearing) {
  if (bearing < 45 || (bearing > 135 && bearing < 225) || bearing > 315) {
    return "ns";
  }
  return "ew";
}

export class Signal {
  constructor(node, dirs, adaptive = false) {
    this.node = node;
    this.dirs = dirs;
    this.adaptive = adaptive;
    this.step = 0;
    this.timer = 0;
    this.phaseTime = 0;
  }

  update(dt) {
    this.timer += dt;
    this.phaseTime += dt;

    let limit = signalYellow;
    if (this.step % 2 === 0) {
      limit = this.adaptive ? this.greenLimit() : signalGreen;
    }

    if (this.timer >= limit) {
      this.timer = 0;
      this.phaseTime = 0;
      this.step = (this.step + 1) % 4;
    }
  }

  greenLimit() {
    const dir = this.step === 0 ? "ns" : "ew";
    const mine = this.queue(dir);
    const other = this.queue(dir === "ns" ? "ew" : "ns");

    if (this.phaseTime < adaptiveMinGreen) return adaptiveMaxGreen;
    if (mine === 0 && other > 0) return this.timer;
    if (mine > 0) return adaptiveMaxGreen;
    return signalGreen;
  }

  queue(dir) {
    let n = 0;
    for (const e of state.incoming.get(this.node.id) || []) {
      if (groupOf(e.bearing) !== dir) continue;
      for (const v of state.vehicles) {
        if (v.parked || v.crashed || v.emergency || v.edge !== e) continue;
        if ((1 - v.t) * e.length < adaptiveRange) n++;
      }
    }
    return n;
  }

  isGo(dir) {
    return ["ns", "nsY", "ew", "ewY"][this.step] === dir;
  }

  color(dir) {
    const now = ["ns", "nsY", "ew", "ewY"][this.step];
    if (now === dir) return "#38d39f";
    if (now === dir + "Y") return "#ffc44d";
    return "#ff6464";
  }
}

export function createSignals() {
  const picks = [];

  for (const [nodeId, out] of state.adjacency) {
    const inc = state.incoming.get(nodeId) || [];
    const total = out.length + inc.length;
    if (total < 3) continue;

    const big = out.concat(inc).some(e =>
      e.type === "primary" || e.type === "secondary" || e.type === "tertiary"
    );
    if (!big) continue;

    picks.push({ nodeId, total });
  }

  picks.sort((a, b) => b.total - a.total);

  for (const pick of picks.slice(0, signalCount)) {
    addSignalAt(pick.nodeId);
  }
}

export function addSignalAt(nodeId, adaptive = false) {
  if (state.signals.has(nodeId)) return false;
  const node = state.nodes.get(nodeId);
  if (!node) return false;

  const inc = state.incoming.get(nodeId) || [];
  const dirs = new Set(inc.map(e => groupOf(e.bearing)));
  state.signals.set(nodeId, new Signal(node, dirs, adaptive));
  drawSignalView(state.signals.get(nodeId));
  return true;
}
