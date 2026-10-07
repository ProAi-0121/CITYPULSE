import { geocode } from "../data/osm.js";
import { state } from "../state.js";
import { minRadius, maxRadius } from "../config.js";

export function showModal(onApply) {
  const box = document.getElementById("locationModal");
  const input = document.getElementById("locationInput");
  const radius = document.getElementById("radiusInput");
  const err = document.getElementById("locationError");
  const btn = document.getElementById("loadAreaBtn");

  input.value = state.name === "Ashoka Marg, Nashik" ? input.value : state.name;
  radius.value = state.radius;
  err.textContent = "";
  box.style.display = "flex";

  async function go() {
    const query = input.value.trim();
    const size = Number(radius.value);

    err.textContent = "";
    if (!query) {
      err.textContent = "Please enter a location.";
      return;
    }
    if (!Number.isFinite(size) || size < minRadius || size > maxRadius) {
      err.textContent = "Radius must be between " + minRadius + " and " + maxRadius + " meters.";
      return;
    }

    btn.disabled = true;
    btn.textContent = "Locating…";

    try {
      const place = await geocode(query);
      box.style.display = "none";
      onApply(place, size);
    } catch (ex) {
      err.textContent = ex.message;
    } finally {
      btn.disabled = false;
      btn.textContent = "Load Roads";
    }
  }

  btn.onclick = go;
  input.onkeydown = e => {
    if (e.key === "Enter") go();
  };
  radius.onkeydown = e => {
    if (e.key === "Enter") go();
  };
}
