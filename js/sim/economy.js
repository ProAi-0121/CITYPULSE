import { state } from "../state.js";
import {
  startBudget,
  dailyTax,
  shopCosts,
  shopMaintenance
} from "../config.js";
import { cameraOn } from "./violation.js";
import { addSignalAt } from "./signals.js";
import { createAmbulances } from "./emergency.js";
import { showAlert } from "../ui/alerts.js";
import { layers } from "../layers.js";

export function buy(kind) {
  const cost = shopCosts[kind];
  if (state.economy.budget < cost) {
    return "Not enough budget for " + kind;
  }

  let placed;
  if (kind === "camera") placed = placeCamera();
  else if (kind === "police") placed = placePolice();
  else if (kind === "signal") placed = placeSignal();
  else if (kind === "smart") placed = placeSmart();
  else if (kind === "ambulance") placed = placeAmbulance();
  if (!placed) return "No suitable location available";

  state.economy.budget -= cost;
  state.economy.items[kind]++;
  return null;
}

function placeSmart() {
  let best = null;
  let bestScore = -1;
  for (const [node, sig] of state.signals) {
    let score = 0;
    for (const e of state.incoming.get(node) || []) {
      score += state.edgeUsage.get(e) || 0;
    }
    if (score > bestScore) {
      bestScore = score;
      best = sig;
    }
  }
  if (!best) {
    const made = placeSignal();
    if (!made) return false;
    best = made;
  }
  best.adaptive = true;
  showAlert("🧠 Smart signal upgraded — it now adapts to queues");
  return true;
}

function placeAmbulance() {
  createAmbulances(1);
  return true;
}

function placeCamera() {
  const taken = new Set(state.cameras.map(c => c.edge));
  let pool = [...state.edgeUsage.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(x => x[0])
    .filter(e => !taken.has(e));

  if (!pool.length) {
    pool = state.edges.filter(e =>
      !taken.has(e) && ["primary", "secondary", "tertiary"].includes(e.type)
    );
  }
  if (!pool.length) return false;

  const edge = pool[Math.floor(Math.random() * pool.length)];
  state.cameras.push({ edge });

  L.marker(
    [edge.a.lat + (edge.b.lat - edge.a.lat) * 0.5,
     edge.a.lon + (edge.b.lon - edge.a.lon) * 0.5],
    {
      icon: L.divIcon({
        className: "",
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        html: '<div class="cam">📷</div>'
      }),
      interactive: false
    }
  ).addTo(layers.enforce);

  showAlert("📷 Speed camera deployed on " + edge.name);
  return true;
}

function placePolice() {
  const taken = new Set(state.police.map(p => p.node));
  const candidates = [];
  for (const [node, inc] of state.incoming) {
    if (taken.has(node)) continue;
    const out = state.adjacency.get(node) || [];
    if (inc.length + out.length >= 3) candidates.push(node);
  }
  if (!candidates.length) return false;

  const node = candidates[Math.floor(Math.random() * candidates.length)];
  state.police.push({ node });

  const n = state.nodes.get(node);
  L.marker([n.lat, n.lon], {
    icon: L.divIcon({
      className: "",
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      html: '<div class="cop">👮</div>'
    }),
    interactive: false
  }).addTo(layers.enforce);

  showAlert("👮 Traffic police deployed at a junction");
  return true;
}

function placeSignal() {
  const candidates = [];
  for (const [node, inc] of state.incoming) {
    if (state.signals.has(node)) continue;
    const out = state.adjacency.get(node) || [];
    const usage = state.edgeUsage.get(inc[0]) || 0;
    if (inc.length + out.length >= 3) {
      candidates.push({ node, score: usage + inc.length + out.length });
    }
  }
  if (!candidates.length) return null;

  candidates.sort((a, b) => b.score - a.score);
  const node = candidates[0].node;
  return addSignalAt(node) ? state.signals.get(node) : null;
}

export function endDay() {
  const e = state.economy;
  const m = shopMaintenance;
  const maint =
    e.items.camera * m.camera +
    e.items.police * m.police +
    e.items.signal * m.signal +
    e.items.smart * m.smart +
    e.items.ambulance * m.ambulance;
  const tax = state.people.length * dailyTax;
  e.budget += tax - maint;

  let delta = 1;
  delta -= state.metrics.accidentsToday * 2;
  delta -= Math.min(3, state.metrics.challansToday * 0.1);
  if (state.metrics.lastResponse != null && state.metrics.lastResponse < 30) delta += 1;
  e.satisfaction = Math.max(0, Math.min(100, e.satisfaction + delta));

  state.metrics.accidentsToday = 0;
  state.metrics.challansToday = 0;

  const fmt = n => "₹" + n.toLocaleString("en-IN");
  const summary =
    "📅 Day " + (state.clock.day - 1) + " over: tax " + fmt(tax) +
    ", maintenance " + fmt(maint) +
    ", budget " + fmt(Math.round(e.budget)) +
    ". Satisfaction " + Math.round(e.satisfaction) +
    " (" + (delta >= 0 ? "+" : "") + delta.toFixed(1) + ")";
  return summary;
}
