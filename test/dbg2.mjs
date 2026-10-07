import { state } from "../js/state.js";
import { updateClock } from "../js/sim/clock.js";
import { updateTraffic } from "../js/sim/traffic.js";
import { updateAccidents, rollAccidents } from "../js/sim/accident.js";
import { createResidents, prepareDestinations } from "../js/sim/person.js";
import { createAmbulances } from "../js/sim/emergency.js";
import { layers } from "../js/layers.js";

const stubMarker = () => {
  const m = { addTo: () => m, on: () => {}, setLatLng: () => {}, setIcon: () => {}, getElement: () => null, options: {} };
  return m;
};
globalThis.L = {
  divIcon: () => ({}), marker: () => stubMarker(),
  featureGroup: () => ({ addTo: () => {}, clearLayers: () => {}, getLayers: () => [], getBounds: () => ({ isValid: () => false }) }),
  layerGroup: () => ({ addTo: () => {}, clearLayers: () => {}, removeLayer: () => {} }),
  circleMarker: () => ({ addTo: () => {}, setStyle: () => {} })
};
globalThis.document = { getElementById: () => ({ textContent: "", classList: { add(){}, remove(){} }, style: {} }), querySelector: () => null };
const grp = () => ({ addTo: () => {}, clearLayers: () => {}, removeLayer: () => {}, getLayers: () => [], getBounds: () => ({ isValid: () => false }) });
layers.map = {}; layers.roads = grp(); layers.signals = grp(); layers.accidents = grp(); layers.enforce = grp(); layers.vehicles = grp();

function addNode(id, lat, lon) { state.nodes.set(id, { id, lat, lon }); }
function connect(from, to) {
  const a = state.nodes.get(from), b = state.nodes.get(to);
  const e = { id: state.edges.length, from, to, a, b, wayId: 1, name: "Test Rd", type: "residential", length: 100, bearing: Math.atan2(b.lon - a.lon, b.lat - a.lat) * 180 / Math.PI };
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
createAmbulances(2);

state.clock.minutes = 8 * 60 + 10;
let firstCrash = -1;
for (let sec = 0; sec < 8000; sec++) {
  updateClock(1);
  for (const p of state.people) p.update(1);
  updateTraffic(1);
  updateAccidents(1);
  if (firstCrash < 0 && sec > 20) rollAccidents(500);
  if (firstCrash < 0 && state.accidents.length > 0) firstCrash = sec;
  if (firstCrash >= 0) {
    const a = state.accidents[0];
    const amb = a && a.ambulance;
    if (sec % 20 === 0 || amb === null || sec - firstCrash > 60) {
      console.log("sec", sec, "acc:", state.accidents.length, "amb:", amb ? amb.phase + " busy=" + amb.busy + " at=" + amb.atNode + " parked=" + amb.parked : "null", "treated:", a ? a.treated.toFixed(0) : "-");
    }
    if (state.accidents.length === 0) { console.log("CLEARED at", sec); break; }
    if (sec > 400) { console.log("NOT CLEARED"); break; }
  }
}
