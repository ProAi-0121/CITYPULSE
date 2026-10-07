import { state } from "../state.js";
import { buy } from "../sim/economy.js";
import { showAlert } from "./alerts.js";

export function initShop() {
  for (const kind of ["camera", "police", "signal"]) {
    document.getElementById("buy" + kind).onclick = () => {
      const err = buy(kind);
      if (err) showAlert("⚠ " + err);
    };
  }
}

export function updateShop() {
  const e = state.economy;
  document.getElementById("budget").textContent =
    "₹" + Math.round(e.budget).toLocaleString("en-IN");
  document.getElementById("items").textContent =
    e.items.camera + " cameras · " + e.items.police + " police · " + e.items.signal + " signals";
}
