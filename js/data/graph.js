import { state } from "../state.js";
import { layers } from "../layers.js";
import { isAllowed, drawRoad } from "../render/roads.js";

function meters(a, b) {
  const R = 6371000;
  const p1 = a.lat * Math.PI / 180;
  const p2 = b.lat * Math.PI / 180;
  const dp = (b.lat - a.lat) * Math.PI / 180;
  const dl = (b.lon - a.lon) * Math.PI / 180;
  const s = Math.sin(dp / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function angle(a, b) {
  const p1 = a.lat * Math.PI / 180;
  const p2 = b.lat * Math.PI / 180;
  const dl = (b.lon - a.lon) * Math.PI / 180;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function addEdge(from, to, tags, wayId) {
  const a = state.nodes.get(from);
  const b = state.nodes.get(to);
  if (!a || !b || from === to) return;

  const len = meters(a, b);
  if (!Number.isFinite(len) || len < 0.5) return;

  const edge = {
    id: state.edges.length,
    from,
    to,
    a,
    b,
    wayId,
    name: tags.name || "Unnamed road",
    type: tags.highway || "road",
    length: len,
    bearing: angle(a, b)
  };

  state.edges.push(edge);

  if (!state.adjacency.has(from)) state.adjacency.set(from, []);
  state.adjacency.get(from).push(edge);

  if (!state.incoming.has(to)) state.incoming.set(to, []);
  state.incoming.get(to).push(edge);
}

export function buildGraph(data) {
  const ways = data.elements.filter(w =>
    w.type === "way" &&
    Array.isArray(w.nodes) &&
    w.nodes.length >= 2 &&
    Array.isArray(w.geometry) &&
    w.geometry.length >= 2 &&
    w.geometry.every(p => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon))) &&
    isAllowed(w.tags)
  );

  for (const way of ways) {
    for (let i = 0; i < Math.min(way.nodes.length, way.geometry.length); i++) {
      const id = way.nodes[i];
      if (!state.nodes.has(id)) {
        state.nodes.set(id, {
          id,
          lat: Number(way.geometry[i].lat),
          lon: Number(way.geometry[i].lon)
        });
      }
    }
  }

  for (const way of ways) {
    state.ways.push(way);
    drawRoad(way);

    const oneway = way.tags ? way.tags.oneway : null;
    for (let i = 0; i < way.nodes.length - 1; i++) {
      const from = way.nodes[i];
      const to = way.nodes[i + 1];
      if (oneway === "yes" || oneway === "1" || oneway === "true") {
        addEdge(from, to, way.tags, way.id);
      } else if (oneway === "-1") {
        addEdge(to, from, way.tags, way.id);
      } else {
        addEdge(from, to, way.tags, way.id);
        addEdge(to, from, way.tags, way.id);
      }
    }
  }

  if (layers.roads.getLayers().length) {
    const bounds = layers.roads.getBounds();
    if (bounds.isValid()) layers.map.fitBounds(bounds, { padding: [22, 22] });
  }

  if (!state.edges.length) {
    throw new Error("Roads were drawn but no graph edges were created.");
  }
}
