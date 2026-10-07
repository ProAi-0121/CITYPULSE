import { state } from "../state.js";
import { roadSpeeds, fines, cameraCatch, challanCooldown } from "../config.js";
import { absMinutes } from "./clock.js";
import { showAlert } from "../ui/alerts.js";

export function cameraOn(edge) {
  for (const c of state.cameras) {
    if (c.edge === edge) return true;
  }
  return false;
}

export function policeAt(node) {
  for (const p of state.police) {
    if (p.node === node) return true;
  }
  return false;
}

function limitOf(edge) {
  return roadSpeeds[edge.type] || 50;
}

export function challan(v, kind, detail, fine) {
  state.challans.unshift({
    time: absMinutes(),
    id: v.id,
    model: v.model,
    kind,
    road: v.edge ? v.edge.name : "Unknown",
    detail,
    fine
  });
  if (state.challans.length > 30) state.challans.pop();

  state.economy.finesToday += fine;
  state.economy.finesTotal += fine;
  state.metrics.challansToday++;
}

export function cameraEntryCheck(v) {
  const e = v.edge;
  if (!cameraOn(e)) return;
  const limit = limitOf(e);
  if (v.speed > limit * cameraCatch && absMinutes() - v.lastChallan > challanCooldown) {
    challan(v, "Speeding", v.speed.toFixed(0) + " in " + limit + " zone", fines.speeding);
    v.lastChallan = absMinutes();
    showAlert("📷 Camera challan: " + v.model + " at " + v.speed.toFixed(0) + " km/h (" + e.name + ")");
  }
}

export function checkEnforcement(dt) {
  for (const v of state.vehicles) {
    if (v.parked || v.crashed || v.emergency) continue;
    const e = v.edge;
    const limit = limitOf(e);
    const cop = policeAt(e.to);

    if (cop && v.speed > limit * cameraCatch + 2 && absMinutes() - v.lastChallan > challanCooldown) {
      challan(v, "Speeding", v.speed.toFixed(0) + " in " + limit + " zone", fines.speeding);
      v.lastChallan = absMinutes();
    }

    if (v.jump && cop && !v.jumpChallaned) {
      challan(v, "Red light", "Ran red light", fines.redLight);
      v.jumpChallaned = true;
      showAlert("👮 Red-light challan: " + v.model + " ran a red light");
    }
  }
}
