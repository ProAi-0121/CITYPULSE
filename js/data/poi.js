import { buildBBox, fetchJSON } from "./osm.js";
import { maxHomes } from "../config.js";

const urls = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter"
];

function classify(tags) {
  const a = tags.amenity;

  if (["hospital", "clinic", "doctors"].includes(a)) {
    return "hospital";
  }
  if (["school", "kindergarten", "college", "university", "library"].includes(a)) {
    return "work";
  }
  if (
    ["marketplace", "pharmacy", "bank", "cafe", "restaurant", "fast_food"].includes(a) ||
    tags.shop
  ) {
    return "market";
  }
  if (a || tags.office) {
    return "work";
  }
  if (tags.building) {
    if (["commercial", "retail", "office", "industrial", "warehouse", "civic", "public"].includes(tags.building)) {
      return "work";
    }
    return "home";
  }
  return null;
}

function pointOf(el) {
  if (el.type === "node") return { lat: el.lat, lon: el.lon };
  if (el.center) return { lat: el.center.lat, lon: el.center.lon };
  return null;
}

export async function fetchPOIs() {
  const bbox = buildBBox();
  const query =
    "[out:json][timeout:25];" +
    "(" +
    'node["amenity"](' + bbox + ");" +
    'node["shop"](' + bbox + ");" +
    'node["office"](' + bbox + ");" +
    'way["amenity"](' + bbox + ");" +
    'way["shop"](' + bbox + ");" +
    'way["office"](' + bbox + ");" +
    'way["building"](' + bbox + ");" +
    ");" +
    "out center tags qt;";

  const empty = { homes: [], works: [], hospitals: [], markets: [] };

  for (const url of urls) {
    try {
      const data = await fetchJSON(url + "?data=" + encodeURIComponent(query));
      const homes = [];
      const works = [];
      const hospitals = [];
      const markets = [];

      for (const el of data.elements || []) {
        if (!el.tags) continue;
        const kind = classify(el.tags);
        const p = pointOf(el);
        if (!kind || !p) continue;
        if (kind === "home" && homes.length < maxHomes) homes.push(p);
        else if (kind === "work") works.push(p);
        else if (kind === "hospital") hospitals.push(p);
        else if (kind === "market") markets.push(p);
      }

      if (!homes.length && !works.length && !hospitals.length) continue;
      return { homes, works, hospitals, markets };
    } catch (err) {
      console.warn("[POI] failed on " + url + ":", err.message);
    }
  }

  return empty;
}
