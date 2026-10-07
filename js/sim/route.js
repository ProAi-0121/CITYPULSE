import { state } from "../state.js";

class Heap {
  constructor() {
    this.a = [];
  }

  get size() {
    return this.a.length;
  }

  push(item) {
    const a = this.a;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }

  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

export function nearestNode(lat, lon) {
  let best = null;
  let bestD = Infinity;
  for (const n of state.nodes.values()) {
    if (!state.adjacency.has(n.id)) continue;
    const d = (n.lat - lat) ** 2 + (n.lon - lon) ** 2;
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best ? best.id : null;
}

export function randomNode() {
  const keys = [...state.adjacency.keys()];
  if (!keys.length) return null;
  return keys[Math.floor(Math.random() * keys.length)];
}

export function findRoute(fromId, toId) {
  if (fromId === toId) return [];
  if (fromId == null || toId == null) return null;

  const dist = new Map([[fromId, 0]]);
  const prevEdge = new Map();
  const done = new Set();
  const heap = new Heap();
  heap.push([0, fromId]);

  while (heap.size) {
    const [d, node] = heap.pop();
    if (done.has(node)) continue;
    done.add(node);

    if (node === toId) break;

    const out = state.adjacency.get(node) || [];
    for (const e of out) {
      if (done.has(e.to)) continue;
      const nd = d + e.length;
      if (nd < (dist.has(e.to) ? dist.get(e.to) : Infinity)) {
        dist.set(e.to, nd);
        prevEdge.set(e.to, e);
        heap.push([nd, e.to]);
      }
    }
  }

  if (!dist.has(toId)) return null;

  const edges = [];
  let cur = toId;
  while (cur !== fromId) {
    const e = prevEdge.get(cur);
    if (!e) return null;
    edges.unshift(e);
    cur = e.from;
  }
  return edges;
}
