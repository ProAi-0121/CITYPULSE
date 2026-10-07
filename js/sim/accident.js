import { state } from "../state.js";
import { accidentChance, accidentTreat } from "../config.js";
import { absMinutes } from "./clock.js";
import { weather } from "./weather.js";
import { showAlert } from "../ui/alerts.js";
import { refreshVehicleMarkers } from "../render/vehicleView.js";
import { layers } from "../layers.js";

export function rollAccidents(dt) {
  for (const v of state.vehicles) {
    if (v.parked || v.crashed || v.emergency) continue;
    if (v.speed < 5) continue;
    if (hasAccident(v.edge)) continue;

    let risk = accidentChance * (0.3 + v.speed / v.topSpeed);
    risk *= 2 - v.compliance;
    risk *= weather().accident;
    if (v.jump) risk *= 3;
    if (Math.random() < risk * dt) crash(v);
  }
}

export function updateAccidents(dt) {
  for (const a of [...state.accidents]) {
    const amb = a.ambulance;
    if (!amb) {
      tryDispatch(a);
      continue;
    }
    if (amb.phase === "toScene" && amb.parked) {
      amb.phase = "scene";
      amb.treated = 0;
      a.arrived = absMinutes();
    } else if (amb.phase === "scene") {
      amb.treated += dt;
      if (amb.treated >= accidentTreat) {
        clear(a);
        amb.returnToBase();
      }
    }
  }

  for (const amb of state.ambulances) {
    if (amb.phase === "return" && amb.parked) {
      amb.phase = "idle";
      amb.busy = false;
    }
  }
}

function crash(v) {
  v.crashed = true;
  v.speed = 0;

  const a = {
    edge: v.edge,
    t: v.t,
    vehicle: v,
    time: absMinutes(),
    treated: 0,
    ambulance: null,
    marker: L.marker(
      [v.edge.a.lat + (v.edge.b.lat - v.edge.a.lat) * v.t,
       v.edge.a.lon + (v.edge.b.lon - v.edge.a.lon) * v.t],
      {
        icon: L.divIcon({
          className: "",
          iconSize: [22, 22],
          iconAnchor: [11, 11],
          html: '<div class="crash">💥</div>'
        }),
        zIndexOffset: 600,
        interactive: false
      }
    ).addTo(layers.accidents)
  };

  state.accidents.push(a);
  state.metrics.accidents++;
  showAlert("⚠ Accident on " + v.edge.name + " — emergency dispatch requested");
}

function hasAccident(edge) {
  for (const a of state.accidents) {
    if (a.edge === edge) return true;
  }
  return false;
}

export function accidentOn(edge) {
  for (const a of state.accidents) {
    if (a.edge === edge) return a;
  }
  return null;
}

function tryDispatch(a) {
  let best = null;
  for (const amb of state.ambulances) {
    if (amb.busy) continue;
    if (!best || amb.atNodeDist(a.edge.to) < best.atNodeDist(a.edge.to)) best = amb;
  }
  if (!best) return;

  const target = a.edge.to;
  if (best.dispatch(target)) {
    a.ambulance = best;
    showAlert("🚑 Ambulance #" + best.id + " dispatched to " + a.edge.name);
  }
}

export function clear(a) {
  const response = a.arrived != null ? a.arrived - a.time : absMinutes() - a.time;
  state.metrics.responseSum += response;
  state.metrics.responseCount++;
  state.metrics.lastResponse = response;

  const v = a.vehicle;
  v.crashed = false;
  v.parked = true;
  v.atNode = a.edge.to;
  refreshVehicleMarkers();

  layers.accidents.removeLayer(a.marker);
  state.accidents.splice(state.accidents.indexOf(a), 1);
  showAlert("✅ Scene cleared on " + a.edge.name + " — road reopened");
}
