import { state } from "../state.js";
import {
  carImages,
  bikeImages,
  carFolder,
  bikeFolder,
  carHeight,
  bikeHeight,
  carAspect,
  bikeAspect,
  signalStop,
  roadSpeeds
} from "../config.js";
import { groupOf } from "./signals.js";
import { findRoute } from "./route.js";
import { cameraOn, policeAt, challan, cameraEntryCheck } from "./violation.js";
import {
  createVehicleMarker,
  updateVehicleMarker,
  refreshVehicleMarkers,
  refreshIcon,
  removeVehicleMarker
} from "../render/vehicleView.js";

export class Vehicle {
  constructor(id, kind) {
    this.id = id;
    this.kind = kind;

    if (kind === "car") {
      const file = carImages[Math.floor(Math.random() * carImages.length)];
      this.model = file.replace(".png", "");
      this.img = carFolder + "/" + file;
      this.topSpeed = 35 + Math.random() * 25;
      this.accel = 1.8 + Math.random() * 2;
      this.brake = 3 + Math.random() * 3;
      this.h = carHeight;
      this.w = carHeight * carAspect;
    } else {
      const file = bikeImages[Math.floor(Math.random() * bikeImages.length)];
      this.model = file.replace(".png", "");
      this.img = bikeFolder + "/" + file;
      this.topSpeed = 35 + Math.random() * 20;
      this.accel = 3 + Math.random() * 2.5;
      this.brake = 4 + Math.random() * 3;
      this.h = bikeHeight;
      this.w = bikeHeight * bikeAspect;
    }

    this.parked = true;
    this.atNode = null;
    this.edge = null;
    this.t = 0;
    this.speed = 0;
    this.route = null;
    this.routeTarget = null;
    this.marker = null;
    this.compliance = 0.55 + Math.random() * 0.45;
    this.jump = false;
    this.jumpChallaned = false;
    this.lastChallan = -9999;
  }

  startTrip(route, targetNode) {
    if (!route || !route.length) return false;
    this.route = route.slice(1);
    this.edge = route[0];
    this.routeTarget = targetNode;
    this.t = 0.05;
    this.speed = 5;
    this.parked = false;

    if (!this.marker) createVehicleMarker(this, pickVehicle);
    else this.marker.setIcon(refreshIcon(this));
    updateVehicleMarker(this);
    return true;
  }

  update(dt, leader) {
    if (this.parked || this.crashed) return;

    const e = this.edge;
    const limit = roadSpeeds[e.type] || 50;
    const over = 1 + (1 - this.compliance) * 0.4;
    let target = Math.min(this.topSpeed, limit * over);

    if (cameraOn(e) || policeAt(e.to)) {
      target = Math.min(target, limit * (0.8 + 0.2 * this.compliance));
    }

    const remaining = e.length * (1 - this.t);

    if (remaining < 25) target *= 0.85;

    if (leader) {
      const gap = (leader.t - this.t) * e.length;
      if (gap < 4) target = 0;
      else if (gap < 16) target = Math.min(target, leader.speed * (gap / 16));
    }

    const stop = this.stopLine();
    if (stop !== null) {
      const dist = remaining - signalStop;
      if (dist < 12) target = Math.min(target, Math.max(0, dist * 1.5));
      if (this.t >= stop) {
        this.t = stop;
        target = 0;
        if (!this.jump && Math.random() < (1 - this.compliance) * 0.15 * dt) {
          this.jump = true;
          if (policeAt(e.to) && !this.jumpChallaned) {
            challan(this, "Red light", "Ran red light", 2000);
            this.jumpChallaned = true;
          }
        }
      }
    }

    target += (Math.random() - 0.5) * 3;

    const rate = target < this.speed ? this.brake : this.accel;
    this.speed += (target - this.speed) * Math.min(1, rate * dt / 8);
    this.speed = Math.max(0, Math.min(this.speed, this.topSpeed));

    const move = this.speed * 1000 / 3600 * dt * state.speed;
    this.t += move / e.length;

    if (stop !== null && this.t > stop) {
      this.t = stop;
      this.speed = 0;
    }

    if (this.t >= 1) this.advance();
    else updateVehicleMarker(this);
  }

  stopLine() {
    if (this.jump) return null;
    const e = this.edge;
    if (e.length < signalStop * 2) return null;
    const sig = state.signals.get(e.to);
    if (!sig) return null;
    if (sig.isGo(groupOf(e.bearing))) return null;
    return Math.max(0, 1 - signalStop / e.length);
  }

  advance() {
    if (this.edge.to === this.routeTarget) {
      this.arrive(this.routeTarget);
      return;
    }
    this.jump = false;
    this.jumpChallaned = false;

    let next = this.route && this.route.length ? this.route.shift() : null;
    if (!next || next.from !== this.edge.to) {
      const again = findRoute(this.edge.to, this.routeTarget);
      if (again && again.length) {
        this.route = again.slice(1);
        next = again[0];
      } else {
        this.arrive(this.edge.to);
        return;
      }
    }

    if (!next) {
      this.arrive(this.edge.to);
      return;
    }

    this.edge = next;
    this.t -= 1;
    cameraEntryCheck(this);
    updateVehicleMarker(this);
  }

  arrive(node) {
    this.atNode = node != null ? node : this.edge.to;
    this.parked = true;
    this.speed = 0;
    this.route = null;
    this.routeTarget = null;
    if (this.marker) this.marker.setIcon(refreshIcon(this));
  }

  destroy() {
    removeVehicleMarker(this);
  }
}

function pickVehicle(v) {
  state.selected = v;
  refreshVehicleMarkers();
}
