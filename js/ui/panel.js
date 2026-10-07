import { state } from "../state.js";
import { clockLabel } from "../sim/clock.js";

export function setStatus(msg, bad = false) {
  const el = document.getElementById("status");
  el.textContent = msg;
  el.style.color = bad ? "#ff8f8f" : "";
}

export function updatePanel() {
  document.getElementById("clock").textContent = clockLabel();
  document.getElementById("roads").textContent = state.ways.length;
  document.getElementById("edges").textContent = state.edges.length;
  document.getElementById("signals").textContent = state.signals.size;
  document.getElementById("people").textContent = state.people.length;

  let moving = 0;
  let parked = 0;
  let sum = 0;
  let count = 0;
  for (const v of state.vehicles) {
    if (v.parked) parked++;
    else {
      if (v.speed > 1) moving++;
      sum += v.speed;
      count++;
    }
  }
  document.getElementById("moving").textContent = moving;
  document.getElementById("parked").textContent = parked;

  const avg = count ? sum / count : 0;
  document.getElementById("avg").textContent = avg.toFixed(1) + " km/h";

  document.getElementById("accidents").textContent = state.metrics.accidents;
  const resp = state.metrics.responseCount
    ? (state.metrics.responseSum / state.metrics.responseCount).toFixed(0) + " min"
    : "—";
  document.getElementById("response").textContent = resp;

  document.getElementById("satisfaction").textContent =
    Math.round(state.economy.satisfaction) + " / 100";
  document.getElementById("violations").textContent = state.challans.length;
  document.getElementById("fines").textContent =
    "₹" + Math.round(state.economy.finesTotal).toLocaleString("en-IN");

  const feed = state.challans.slice(0, 3).map(c =>
    "#" + c.id + " " + c.kind + " · " + c.detail
  );
  document.getElementById("challanFeed").innerHTML =
    feed.length ? feed.map(f => "<div>" + f + "</div>").join("") : "<div>No challans yet</div>";

  const box = document.getElementById("selected");
  const v = state.selected;

  if (!v) {
    box.textContent = "Click a vehicle.";
    return;
  }

  box.innerHTML =
    "<b>#" + v.id + " · " + esc(v.model) + "</b><br>" +
    "Type: " + v.kind + "<br>" +
    "Status: " + (v.parked ? "Parked" : "Driving") + "<br>" +
    "Road: " + esc(v.edge ? v.edge.name : "Unknown") + "<br>" +
    "Speed: " + (v.speed ? v.speed.toFixed(1) : "0") + " km/h<br>" +
    "Top: " + v.topSpeed.toFixed(1) + " km/h";
}

function esc(v) {
  return String(v).replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}
