import { state } from "../state.js";
import { nightDarkness } from "../config.js";

let last = -1;

export function updateDayNight() {
  const h = state.clock.minutes / 60;
  let d;
  if (h < 5) d = 1;
  else if (h < 7) d = 1 - (h - 5) / 2;
  else if (h < 18) d = 0;
  else if (h < 21) d = (h - 18) / 3;
  else d = 1;

  const value = Math.round(d * nightDarkness * 100) / 100;
  if (value === last) return;
  last = value;
  document.getElementById("nightTint").style.opacity = value;
}
