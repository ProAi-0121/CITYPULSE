import { analyze } from "../sim/advisor.js";
import { showAlert } from "./alerts.js";

export function runAdvisor(auto = false) {
  const tips = analyze();
  const box = document.getElementById("advisor");
  box.innerHTML = tips
    .map((t, i) =>
      "<div><b>" + (i + 1) + ".</b> " + t.icon + " " + t.text +
      " <i>[" + t.est + "]</i></div>"
    )
    .join("");
  if (auto) showAlert("🤖 AI Advisor: " + tips[0].text);
}
