import { state } from "../state.js";
import { rollAccidents } from "./accident.js";

export function updateTraffic(dt) {
  rollAccidents(dt);

  const byEdge = new Map();

  for (const v of state.vehicles) {
    if (v.parked || v.crashed) continue;
    if (!byEdge.has(v.edge)) byEdge.set(v.edge, []);
    byEdge.get(v.edge).push(v);
    state.edgeUsage.set(v.edge, (state.edgeUsage.get(v.edge) || 0) + 1);
  }

  addAccidentObstacles(byEdge);

  for (const list of byEdge.values()) {
    list.sort((a, b) => b.t - a.t);
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (item.obstacle) continue;
      item.update(dt, list[i - 1] || null);
    }
  }
}

function addAccidentObstacles(byEdge) {
  for (const a of state.accidents) {
    if (!byEdge.has(a.edge)) byEdge.set(a.edge, []);
    byEdge.get(a.edge).push({ t: a.t, speed: 0, obstacle: true });
  }
}
