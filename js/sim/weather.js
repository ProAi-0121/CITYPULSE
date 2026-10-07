import { state } from "../state.js";
import { weatherTypes, weatherChangeMin, weatherChangeMax } from "../config.js";
import { showAlert } from "../ui/alerts.js";

export function weather() {
  return weatherTypes[state.weather.kind];
}

export function setWeather(kind) {
  state.weather.kind = kind;
  state.weather.timer = weatherChangeMin +
    Math.random() * (weatherChangeMax - weatherChangeMin);
}

export function updateWeather(dt) {
  const w = state.weather;
  w.timer -= dt;
  if (w.timer > 0) return;

  const kinds = Object.keys(weatherTypes).filter(k => k !== w.kind);
  const next = kinds[Math.floor(Math.random() * kinds.length)];
  setWeather(next);

  const t = weatherTypes[next];
  showAlert(t.icon + " " + t.label + " — roads affected, drive safe");
}
