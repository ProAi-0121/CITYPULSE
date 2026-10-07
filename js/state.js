import { startMinutes, startBudget, satisfactionStart, weatherChangeMin } from "./config.js";

export const state = {
  running: true,
  speed: 1,
  center: [19.98093, 73.79544],
  radius: 1800,
  name: "Ashoka Marg, Nashik",
  clock: { day: 1, minutes: startMinutes },
  weather: { kind: "clear", timer: weatherChangeMin },
  nodes: new Map(),
  adjacency: new Map(),
  incoming: new Map(),
  edges: [],
  ways: [],
  signals: new Map(),
  people: [],
  pois: { homes: [], works: [], hospitals: [], markets: [], busstops: [] },
  vehicles: [],
  accidents: [],
  ambulances: [],
  cameras: [],
  police: [],
  challans: [],
  edgeUsage: new Map(),
  accidentRoads: new Map(),
  economy: {
    budget: startBudget,
    satisfaction: satisfactionStart,
    items: { camera: 0, police: 0, signal: 0, smart: 0, ambulance: 0, bus: 0 },
    finesToday: 0,
    finesTotal: 0
  },
  metrics: {
    accidents: 0,
    accidentsToday: 0,
    responseSum: 0,
    responseCount: 0,
    lastResponse: null,
    challansToday: 0
  },
  selected: null,
  nextId: 1
};

export function resetWorld() {
  state.nodes.clear();
  state.adjacency.clear();
  state.incoming.clear();
  state.edges = [];
  state.ways = [];
  state.signals.clear();
  state.pois = { homes: [], works: [], hospitals: [], markets: [], busstops: [] };
  for (const v of state.vehicles) v.destroy();
  state.vehicles = [];
  state.people = [];
  state.accidents = [];
  state.ambulances = [];
  state.cameras = [];
  state.police = [];
  state.challans = [];
  state.edgeUsage = new Map();
  state.accidentRoads = new Map();
  state.economy = {
    budget: startBudget,
    satisfaction: satisfactionStart,
    items: { camera: 0, police: 0, signal: 0, smart: 0, ambulance: 0, bus: 0 },
    finesToday: 0,
    finesTotal: 0
  };
  state.metrics = {
    accidents: 0,
    accidentsToday: 0,
    responseSum: 0,
    responseCount: 0,
    lastResponse: null,
    challansToday: 0
  };
  state.selected = null;
  state.nextId = 1;
  state.clock = { day: 1, minutes: startMinutes };
  state.weather = { kind: "clear", timer: weatherChangeMin };
}
