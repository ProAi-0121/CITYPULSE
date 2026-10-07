import { state } from "../state.js";
import { busSpeed, busDwell } from "../config.js";
import { findRoute } from "./route.js";
import { Vehicle } from "./vehicle.js";
import { refreshIcon } from "../render/vehicleView.js";

export class Bus extends Vehicle {
  constructor(id, stops) {
    super(id, "bus");
    this.stops = stops;
    this.stopIndex = 0;
    this.atStop = true;
    this.dwell = 5;
    this.atNode = stops[0];
  }

  arrive(node) {
    this.atNode = node != null ? node : this.edge.to;
    this.parked = true;
    this.atStop = true;
    this.dwell = busDwell;
    this.speed = 0;
    this.route = null;
    this.routeTarget = null;
    if (this.marker) this.marker.setIcon(refreshIcon(this));
  }

  update(dt, leader) {
    if (this.atStop) {
      this.dwell -= dt;
      if (this.dwell <= 0) this.nextLeg();
      return;
    }
    super.update(dt, leader);
  }

  nextLeg() {
    this.stopIndex = (this.stopIndex + 1) % this.stops.length;
    const target = this.stops[this.stopIndex];
    const route = findRoute(this.atNode, target);
    if (route && route.length && this.startTrip(route, target)) {
      this.atStop = false;
    } else {
      this.atNode = target;
      this.dwell = 20;
    }
  }
}

export function createBuses(count = 1) {
  const stops = state.pois.busstops;
  if (!stops || stops.length < 2) return false;
  for (let i = 0; i < count; i++) {
    const bus = new Bus(state.nextId, stops);
    state.nextId++;
    state.vehicles.push(bus);
  }
  return true;
}
