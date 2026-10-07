import { state } from "../state.js";
import { minRadius } from "../config.js";

const urls = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter"
];

export async function geocode(query) {
  const coords = query.match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);
  if (coords) {
    const lat = Number(coords[1]);
    const lon = Number(coords[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return { lat, lon, name: lat.toFixed(5) + ", " + lon.toFixed(5) };
    }
  }

  const url =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
    encodeURIComponent(query);

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Geocoding failed (HTTP " + res.status + ")");

  const found = await res.json();
  if (!Array.isArray(found) || found.length === 0) {
    throw new Error('Place not found: "' + query + '"');
  }

  const hit = found[0];
  const name = String(hit.display_name || "").split(",").slice(0, 3).join(",").trim();
  return { lat: Number(hit.lat), lon: Number(hit.lon), name: name || query };
}

export async function fetchJSON(url) {
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), 40000);
  try {
    const res = await fetch(url, { cache: "no-store", signal: stop.signal });
    const text = await res.text();
    if (!res.ok) throw new Error("HTTP " + res.status);
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

export function buildBBox(radius = state.radius) {
  const metersLat = m => m / 111320;
  const metersLon = (m, lat) => m / (111320 * Math.cos(lat * Math.PI / 180));
  const dLat = metersLat(radius);
  const dLon = metersLon(radius, state.center[0]);
  return [
    state.center[0] - dLat,
    state.center[1] - dLon,
    state.center[0] + dLat,
    state.center[1] + dLon
  ].join(",");
}

export async function fetchRoads() {
  const base = "primary|secondary|tertiary|unclassified|residential";
  const attempts = [
    { radius: state.radius, filter: base },
    { radius: Math.max(minRadius, state.radius * 0.75), filter: base + "|service" },
    { radius: Math.max(minRadius, state.radius * 0.5), filter: base + "|service" }
  ];

  let lastError = null;

  for (const tryThis of attempts) {
    const query =
      "[out:json][timeout:25];" +
      'way["highway"~"' + tryThis.filter + '"](' + buildBBox(tryThis.radius) + ");" +
      "out body geom qt;";

    for (const url of urls) {
      try {
        const data = await fetchJSON(url + "?data=" + encodeURIComponent(query));
        if (!Array.isArray(data.elements) || data.elements.length === 0) {
          throw new Error("Overpass returned no roads");
        }
        return data;
      } catch (err) {
        lastError = err;
        console.warn("[OSM] failed on " + url + ":", err.message);
      }
    }
  }

  throw lastError || new Error("All Overpass requests failed.");
}
