import { state } from "../state.js";
import { ambulanceSpeed, ambulanceCount } from "../config.js";
import { findRoute } from "./route.js";
import { Vehicle } from "./vehicle.js";

export class Ambulance extends Vehicle {
  constructor(id, baseNode) {
    super(id, "car");
    this.model = "Ambulance";
    this.img = "Cars/Toyota Innova.png";
    this.topSpeed = ambulanceSpeed;
    this.accel = 4;
    this.brake = 5;
    this.base = baseNode;
    this.atNode = baseNode;
    this.emergency = true;
    this.busy = false;
    this.phase = "idle";
    this.treated = 0;
  }

  stopLine() {
    return null;
  }

  atNodeDist(nodeId) {
    const a = state.nodes.get(this.atNode);
    const b = state.nodes.get(nodeId);
    if (!a || !b) return Infinity;
    return (a.lat - b.lat) ** 2 + (a.lon - b.lon) ** 2;
  }

  dispatch(targetNode) {
    const route = findRoute(this.atNode, targetNode);
    if (!route || !route.length) return false;
    this.busy = true;
    this.phase = "toScene";
    return this.startTrip(route, targetNode);
  }

  returnToBase() {
    const route = findRoute(this.atNode, this.base);
    if (route && route.length && this.startTrip(route, this.base)) {
      this.phase = "return";
    } else {
      this.atNode = this.base;
      this.phase = "idle";
      this.busy = false;
    }
  }
}

export function createAmbulances(count = ambulanceCount) {
  const bases = state.pois.hospitals.length ? state.pois.hospitals : state.pois.works;
  for (let i = 0; i < count; i++) {
    const base = bases[Math.floor(Math.random() * bases.length)];
    const amb = new Ambulance(state.nextId, base);
    state.nextId++;
    state.ambulances.push(amb);
    state.vehicles.push(amb);
  }
}
