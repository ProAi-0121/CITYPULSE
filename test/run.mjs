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
if (firstCrash < 0 || clearedTick < 0) { console.log("TEST FAILED (accident cycle)"); process.exit(1); }
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

console.log("TEST PASSED");
