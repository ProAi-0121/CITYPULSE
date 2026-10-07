import { state } from "../state.js";
import { simMinutesPerSecond } from "../config.js";

export function updateClock(dt) {
  state.clock.minutes += dt * simMinutesPerSecond;
  if (state.clock.minutes >= 1440) {
    state.clock.minutes -= 1440;
    state.clock.day++;
    return true;
  }
  return false;
}

export function absMinutes() {
  return (state.clock.day - 1) * 1440 + state.clock.minutes;
}

export function clockLabel() {
  const total = Math.floor(state.clock.minutes);
  const h = String(Math.floor(total / 60)).padStart(2, "0");
  const m = String(total % 60).padStart(2, "0");
  return "Day " + state.clock.day + " · " + h + ":" + m;
}
