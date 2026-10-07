import { layers } from "../layers.js";

const offset = 0.00012;

export function drawSignalViews(signals) {
  for (const sig of signals.values()) drawSignalView(sig);
}

export function drawSignalView(sig) {
  if (sig.views) return;
  sig.views = {};
  const n = sig.node;

  if (sig.adaptive) {
    L.marker([n.lat, n.lon], {
      icon: L.divIcon({
        className: "",
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        html: '<div class="cam">🧠</div>'
      }),
      interactive: false
    }).addTo(layers.signals);
  }

  if (sig.dirs.has("ns")) {
    sig.views.ns = L.circleMarker([n.lat + offset, n.lon], {
      radius: 5,
      color: "#10151b",
      weight: 1,
      fillColor: "#ff6464",
      fillOpacity: 0.95
    }).addTo(layers.signals);
  }

  if (sig.dirs.has("ew")) {
    sig.views.ew = L.circleMarker([n.lat, n.lon + offset], {
      radius: 5,
      color: "#10151b",
      weight: 1,
      fillColor: "#ff6464",
      fillOpacity: 0.95
    }).addTo(layers.signals);
  }
}

export function updateSignalViews(signals) {
  for (const sig of signals.values()) {
    for (const dir of ["ns", "ew"]) {
      const view = sig.views && sig.views[dir];
      if (view) view.setStyle({ fillColor: sig.color(dir) });
    }
  }
}

export function clearSignalViews() {
  layers.signals.clearLayers();
}
