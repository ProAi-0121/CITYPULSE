import { state, resetWorld } from "./state.js";
import { layers } from "./layers.js";
import { fetchRoads } from "./data/osm.js";
import { fetchPOIs } from "./data/poi.js";
import { buildGraph } from "./data/graph.js";
import { createSignals } from "./sim/signals.js";
import { updateClock } from "./sim/clock.js";
import { updateTraffic } from "./sim/traffic.js";
import { updateAccidents } from "./sim/accident.js";
import { checkEnforcement } from "./sim/violation.js";
import { endDay } from "./sim/economy.js";
import { createAmbulances } from "./sim/emergency.js";
import { createResidents, prepareDestinations } from "./sim/person.js";
import { drawSignalViews, updateSignalViews, clearSignalViews } from "./render/signals.js";
import { updateDayNight } from "./render/daynight.js";
import { showModal } from "./ui/modal.js";
import { setStatus, updatePanel } from "./ui/panel.js";
import { initShop, updateShop } from "./ui/shop.js";
import { showAlert } from "./ui/alerts.js";

const satellite = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  { maxZoom: 20, maxNativeZoom: 19, attribution: "Tiles &copy; Esri" }
);

const street = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  { maxZoom: 20, maxNativeZoom: 19, attribution: "&copy; OpenStreetMap contributors" }
);

layers.map = L.map("map", { zoomControl: true, maxZoom: 20 }).setView(state.center, 15);
satellite.addTo(layers.map);

layers.roads = L.featureGroup().addTo(layers.map);
layers.signals = L.layerGroup().addTo(layers.map);
layers.accidents = L.layerGroup().addTo(layers.map);
layers.enforce = L.layerGroup().addTo(layers.map);
layers.vehicles = L.layerGroup().addTo(layers.map);

initShop();

let satelliteOn = true;

document.getElementById("basemapToggle").onclick = () => {
  const btn = document.getElementById("basemapToggle");
  if (satelliteOn) {
    layers.map.removeLayer(satellite);
    street.addTo(layers.map);
    satelliteOn = false;
    btn.textContent = "🛰️ Satellite";
  } else {
    layers.map.removeLayer(street);
    satellite.addTo(layers.map);
    satelliteOn = true;
    btn.textContent = "🗺️ Street Map";
  }
};

document.getElementById("toggle").onclick = e => {
  state.running = !state.running;
  e.target.textContent = state.running ? "Pause" : "Resume";
};

document.getElementById("spawn").onclick = () => createResidents(1);
document.getElementById("reload").onclick = () => showModal(applyArea);
document.getElementById("simSpeed").onchange = e => {
  state.speed = Number(e.target.value);
};

function applyArea(place, radius) {
  state.center = [place.lat, place.lon];
  state.radius = radius;
  state.name = place.name;
  document.querySelector(".topbar h1").textContent =
    "🚗 " + place.name + " — Autonomous Traffic Lab";
  layers.map.setView(state.center, 15);
  load();
}

async function load() {
  setStatus("Loading road data around " + state.name + "…");
  try {
    const data = await fetchRoads();
    resetWorld();
    layers.roads.clearLayers();
    layers.enforce.clearLayers();
    clearSignalViews();
    buildGraph(data);

    setStatus("Loading places of interest…");
    let pois = { homes: [], works: [], markets: [] };
    try {
      pois = await fetchPOIs();
    } catch (err) {
      console.warn("[AUTONOMOUS CITY] POI loading failed:", err);
    }
    prepareDestinations(pois);

    createSignals();
    drawSignalViews(state.signals);
    createResidents();
    createAmbulances();

    setStatus(
      "Loaded " + state.ways.length + " roads, " +
      state.signals.size + " signals, " +
      state.people.length + " residents, " +
      state.ambulances.length + " ambulances."
    );
  } catch (err) {
    console.error("[AUTONOMOUS CITY] load failed:", err);
    const at = (err.stack || "").split("\n")[1] || "";
    setStatus("Loading failed: " + err.message + " @ " + at.trim().slice(0, 140), true);
  }
}

let last = performance.now();

function tick() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (state.running && state.edges.length) {
    const step = dt * state.speed;
    const newDay = updateClock(step);
    if (newDay) {
      for (const p of state.people) p.newDay();
      showAlert(endDay());
    }
    for (const p of state.people) p.update(step);
    for (const sig of state.signals.values()) sig.update(step);
    updateSignalViews(state.signals);
    updateTraffic(step);
    updateAccidents(step);
    checkEnforcement(step);
  }

  updateDayNight();
  updateShop();
  updatePanel();
}

function frame() {
  tick();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

setInterval(() => {
  if (performance.now() - last > 300) tick();
}, 100);

showModal(applyArea);
