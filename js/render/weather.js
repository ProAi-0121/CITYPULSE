import { state } from "../state.js";
import { weatherTypes } from "../config.js";

let lastKind = null;

export function updateWeatherView() {
  if (state.weather.kind === lastKind) return;
  lastKind = state.weather.kind;

  const w = weatherTypes[state.weather.kind];
  const tint = document.getElementById("weatherTint");
  tint.style.background = state.weather.kind === "fog" ? "#c8cfcf" : "#0a1430";
  tint.style.opacity = w.tint;
  document.getElementById("weatherLabel").textContent = w.icon + " " + w.label;
}
