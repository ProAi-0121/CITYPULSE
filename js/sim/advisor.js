import { state } from "../state.js";

export function analyze() {
  const tips = [];

  let hot = null;
  let hotCount = 0;
  for (const [name, count] of state.accidentRoads) {
    if (count > hotCount) {
      hotCount = count;
      hot = name;
    }
  }
  if (hot && hotCount >= 2) {
    tips.push({
      icon: "📷",
      text: hot + " had " + hotCount + " accidents — deploy a speed camera there",
      est: "Accidents ~20% down"
    });
  }

  const avgResp = state.metrics.responseCount
    ? state.metrics.responseSum / state.metrics.responseCount
    : 0;
  if (avgResp > 25) {
    tips.push({
      icon: "🚑",
      text: "Ambulance response averages " + avgResp.toFixed(0) + " min — buy one more",
      est: "Response ~30% down"
    });
  }

  if (state.economy.finesTotal > 15000) {
    tips.push({
      icon: "🧠",
      text: "Frequent violations — upgrade busy junctions to smart signals",
      est: "Violations down"
    });
  }

  if (state.economy.satisfaction < 55) {
    tips.push({
      icon: "📉",
      text: "Satisfaction is low — clear hotspots and keep response fast",
      est: "Satisfaction up"
    });
  }

  if (!tips.length) {
    tips.push({ icon: "✅", text: "City is running smoothly. Keep monitoring.", est: "—" });
  }

  return tips.slice(0, 3);
}
