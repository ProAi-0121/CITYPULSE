import { state } from "../state.js";
import { signalCount, signalGreen, signalYellow } from "../config.js";
import { drawSignalView } from "../render/signals.js";

export function groupOf(bearing) {
  if (bearing < 45 || (bearing > 135 && bearing < 225) || bearing > 315) {
    return "ns";
  }
  return "ew";
}

export class Signal {
  constructor(node, dirs) {
    this.node = node;
    this.dirs = dirs;
    this.step = 0;
    this.timer = 0;
  }

  update(dt) {
    this.timer += dt;
    const limit = this.step % 2 === 0 ? signalGreen : signalYellow;
    if (this.timer >= limit) {
      this.timer = 0;
      this.step = (this.step + 1) % 4;
    }
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

export function addSignalAt(nodeId) {
  if (state.signals.has(nodeId)) return false;
  const node = state.nodes.get(nodeId);
  if (!node) return false;

  const inc = state.incoming.get(nodeId) || [];
  const dirs = new Set(inc.map(e => groupOf(e.bearing)));
  state.signals.set(nodeId, new Signal(node, dirs));
  drawSignalView(state.signals.get(nodeId));
  return true;
}
