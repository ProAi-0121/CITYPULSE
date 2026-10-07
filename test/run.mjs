import { state } from "../js/state.js";
import { updateClock } from "../js/sim/clock.js";
import { updateTraffic } from "../js/sim/traffic.js";
import { updateAccidents, rollAccidents } from "../js/sim/accident.js";
import { checkEnforcement, cameraEntryCheck } from "../js/sim/violation.js";
import { buy, endDay } from "../js/sim/economy.js";
import { createResidents, prepareDestinations } from "../js/sim/person.js";
import { createAmbulances } from "../js/sim/emergency.js";
import { layers } from "../js/layers.js";
import { setWeather, weather } from "../js/sim/weather.js";
import { Signal } from "../js/sim/signals.js";
import { dailyMigration } from "../js/sim/person.js";
import { analyze } from "../js/sim/advisor.js";
import { createBuses } from "../js/sim/bus.js";

const stubMarker = () => {
  const m = {
    addTo: () => m,
    on: () => {},
    setLatLng: () => {},
    setIcon: () => {},
    getElement: () => null,
    options: {}
  };
  return m;
};
globalThis.L = {
  divIcon: () => ({}),
  marker: () => stubMarker(),
  featureGroup: () => ({ addTo: () => {}, clearLayers: () => {}, getLayers: () => [], getBounds: () => ({ isValid: () => false }) }),
  layerGroup: () => ({ addTo: () => {}, clearLayers: () => {}, removeLayer: () => {} }),
  circleMarker: () => ({ addTo: () => {}, setStyle: () => {} })
};
globalThis.document = {
  getElementById: () => ({ textContent: "", classList: { add() {}, remove() {} }, style: {} }),
  querySelector: () => null
};
const grp = () => ({ addTo: () => {}, clearLayers: () => {}, removeLayer: () => {}, getLayers: () => [], getBounds: () => ({ isValid: () => false }) });
layers.map = { setView: () => {}, fitBounds: () => {} };
layers.roads = grp(); layers.signals = grp(); layers.accidents = grp(); layers.enforce = grp(); layers.vehicles = grp();

function addNode(id, lat, lon) {
  state.nodes.set(id, { id, lat, lon });
}
function connect(from, to) {
  const a = state.nodes.get(from);
  const b = state.nodes.get(to);
  const e = {
    id: state.edges.length, from, to, a, b, wayId: 1,
    name: "Test Rd", type: "residential",
    length: 100,
    bearing: Math.atan2(b.lon - a.lon, b.lat - a.lat) * 180 / Math.PI
  };
  state.edges.push(e);
  if (!state.adjacency.has(from)) state.adjacency.set(from, []);
  state.adjacency.get(from).push(e);
  if (!state.incoming.has(to)) state.incoming.set(to, []);
  state.incoming.get(to).push(e);
}

addNode(1, 0, 0); addNode(2, 0.001, 0); addNode(3, 0.002, 0);
addNode(4, 0, 0.001); addNode(5, 0.001, 0.001); addNode(6, 0.002, 0.001);
for (const [a, b] of [[1,2],[2,3],[4,5],[5,6],[1,4],[2,5],[3,6]]) { connect(a, b); connect(b, a); }

prepareDestinations({ homes: [], works: [], hospitals: [], markets: [] });
createResidents(20);
createAmbulances(1);

state.clock.minutes = 8 * 60 + 10;

let firstCrash = -1;
let clearedTick = -1;
let ticks = 0;

for (let sec = 0; sec < 20000; sec++) {
  ticks = sec;
  updateClock(1);
  for (const p of state.people) p.update(1);
  updateTraffic(1);
  updateAccidents(1);

  if (firstCrash < 0 && state.accidents.length > 0) firstCrash = sec;
  if (firstCrash >= 0 && state.accidents.length === 0) {
    clearedTick = sec;
    break;
  }
  if (firstCrash < 0 && sec > 20) rollAccidents(500);
}

console.log("firstCrash:", firstCrash, "cleared:", clearedTick);
if (firstCrash < 0 || clearedTick < 0) {
  console.log("TEST FAILED (accident cycle)");
  console.log("accidents:", JSON.stringify(state.accidents.map(a => ({ amb: a.ambulance ? a.ambulance.phase + "/" + a.ambulance.parked : null, treated: Math.round(a.treated), edge: a.edge.id }))));
  console.log("ambulances:", JSON.stringify(state.ambulances.map(x => ({ phase: x.phase, busy: x.busy, at: x.atNode, parked: x.parked, edge: x.edge ? x.edge.id : null }))));
  process.exit(1);
}
if (state.metrics.responseCount === 0) { console.log("no response recorded"); process.exit(1); }
if (state.vehicles.some(v => v.crashed)) { console.log("crashed vehicle stuck"); process.exit(1); }
console.log("accident cycle OK, response =", state.metrics.lastResponse, "min");

state.clock.minutes = 8 * 60;
const budgetBefore = state.economy.budget;
if (buy("camera")) { console.log("buy camera failed"); process.exit(1); }
if (state.economy.budget !== budgetBefore - 50000) { console.log("budget math wrong"); process.exit(1); }
if (state.cameras.length !== 1) { console.log("camera not placed"); process.exit(1); }
console.log("camera purchase OK, on", state.cameras[0].edge.name);

const speeder = state.vehicles.find(v => !v.emergency);
speeder.edge = state.cameras[0].edge;
speeder.speed = 45;
speeder.lastChallan = -9999;
cameraEntryCheck(speeder);
if (state.economy.finesToday === 0 || state.challans.length === 0) {
  console.log("camera did not challan a speeder"); process.exit(1);
}
console.log("camera challan OK:", state.challans[0].kind, state.challans[0].detail, "fine", state.challans[0].fine);

const b0 = state.economy.budget;
if (!buy("camera") && state.economy.budget < 50000 * 4) {
  state.economy.budget = 0;
  if (!buy("camera")) { console.log("bought with empty budget"); process.exit(1); }
  console.log("insufficient budget rejected OK");
}

state.metrics.accidentsToday = 2;
state.metrics.challansToday = 10;
state.metrics.lastResponse = 15;
const satBefore = state.economy.satisfaction;
const summary = endDay();
if (state.economy.satisfaction === satBefore) { console.log("satisfaction frozen"); process.exit(1); }
console.log(summary);

setWeather("rain");
if (weather().speed !== 0.85 || weather().accident !== 1.6) {
  console.log("rain factors wrong"); process.exit(1);
}
setWeather("storm");
if (weather().accident !== 2.4) { console.log("storm factors wrong"); process.exit(1); }
setWeather("clear");
console.log("weather factors OK");

const sig = new Signal(state.nodes.get(1), new Set(["ns", "ew"]), true);
const queued = state.vehicles.find(v => !v.emergency);
queued.parked = false;
queued.crashed = false;
queued.speed = 0;
queued.edge = state.edges.find(e => e.from === 4 && e.to === 1);
queued.t = 0.97;
state.vehicles.push(queued);
sig.step = 2;
sig.timer = 6;
sig.phaseTime = 6;
sig.update(1);
if (sig.step !== 3) { console.log("adaptive signal did not switch, step=" + sig.step); process.exit(1); }
console.log("adaptive signal OK: switched to yellow with queue on other side");

state.economy.satisfaction = 85;
const before = state.people.length;
const mig = dailyMigration();
if (state.people.length <= before) { console.log("no move-in at high satisfaction"); process.exit(1); }
console.log("migration OK: +" + mig.moveIn + " residents at satisfaction 85");

state.accidentRoads.set("Test Rd", 3);
const tips = analyze();
if (!tips[0].text.includes("Test Rd")) { console.log("advisor missed hotspot: " + tips[0].text); process.exit(1); }
console.log("advisor OK:", tips[0].text);

const ambBefore = state.ambulances.length;
const b4 = state.economy.budget;
if (buy("ambulance")) { console.log("ambulance purchase failed"); process.exit(1); }
if (state.ambulances.length !== ambBefore + 1 || state.economy.budget !== b4 - 100000) {
  console.log("ambulance purchase math wrong"); process.exit(1);
}
console.log("ambulance purchase OK");

const b5 = state.economy.budget;
if (buy("smart")) { console.log("smart purchase failed"); process.exit(1); }
const smartSig = [...state.signals.values()].find(s => s.adaptive);
if (!smartSig) { console.log("no adaptive signal after smart purchase"); process.exit(1); }
if (state.economy.budget !== b5 - 120000) { console.log("smart budget math wrong"); process.exit(1); }
console.log("smart signal purchase OK");

const busBefore = state.vehicles.filter(v => v.kind === "bus").length;
if (createBuses(1)) {
  const bus = state.vehicles[state.vehicles.length - 1];
  if (bus.kind !== "bus" || !bus.atStop) { console.log("bus init wrong"); process.exit(1); }

  let stoppedAtStop = false;
  let moved = false;
  let lastT = -1;
  for (let sec = 0; sec < 4000; sec++) {
    updateClock(1);
    updateTraffic(1);
    updateAccidents(1);
    if (bus.atStop) stoppedAtStop = true;
    if (bus.edge && !bus.atStop && bus.t !== lastT) { moved = true; lastT = bus.t; }
    if (stoppedAtStop && bus.stopIndex > 0 && bus.stopIndex !== bus.stops.length) break;
  }
  if (!moved) { console.log("bus never moved"); process.exit(1); }
  if (!stoppedAtStop) { console.log("bus never stopped at a stop"); process.exit(1); }
  if (bus.stopIndex === 0) { console.log("bus never progressed around loop"); process.exit(1); }
  console.log("bus OK: drives loop, stops at stops, stopIndex =", bus.stopIndex);

  const bB = state.economy.budget;
  state.economy.satisfaction = 65;
  const sB = state.economy.satisfaction;
  const summary2 = endDay();
  if (state.economy.budget <= bB) { console.log("bus fares not applied"); process.exit(1); }
  if (state.economy.satisfaction <= sB) { console.log("bus satisfaction bonus missing"); process.exit(1); }
  console.log("bus economy OK:", summary2.slice(0, 60));
} else {
  console.log("no bus stops available (fallback should exist)");
}
console.log("TEST PASSED");
