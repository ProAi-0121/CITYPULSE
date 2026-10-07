import { layers } from "../layers.js";
import { roadWidth } from "../config.js";

const allowed = new Set([
  "primary", "secondary", "tertiary", "unclassified", "residential", "service"
]);

export function isAllowed(tags) {
  return tags ? allowed.has(tags.highway) : false;
}

export function drawRoad(way) {
  const points = way.geometry.map(p => [Number(p.lat), Number(p.lon)]);
  const type = way.tags.highway;
  const width = roadWidth[type] || 3;

  L.polyline(points, {
    color: "#171c23",
    weight: width + 7,
    opacity: 0.96,
    lineCap: "round",
    lineJoin: "round"
  })
    .bindTooltip(way.tags.name || "Unnamed road", { sticky: true })
    .addTo(layers.roads);

  L.polyline(points, {
    color: "#59636f",
    weight: width,
    opacity: 0.98,
    lineCap: "round",
    lineJoin: "round"
  }).addTo(layers.roads);

  if (type === "primary" || type === "secondary" || type === "tertiary") {
    L.polyline(points, {
      color: "#d0c79f",
      weight: 1,
      opacity: 0.62,
      dashArray: "7 9",
      lineCap: "butt"
    }).addTo(layers.roads);
  }
}
