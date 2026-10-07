import { state } from "../state.js";
import { layers } from "../layers.js";

function makeIcon(v) {
  if (v.kind === "bus") {
    const cls =
      (v.atStop ? "parked " : "") + (state.selected === v ? "picked" : "");
    return L.divIcon({
      className: "",
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      html:
        '<div class="car-view ' + cls + '"><div class="busicon">🚌</div></div>'
    });
  }

  const rot = v.edge ? v.edge.bearing : 0;
  const cls =
    (v.parked ? "parked " : "") +
    (v.emergency ? "emergency " : "") +
    (state.selected === v ? "picked" : "");
  const beacon = v.emergency ? '<div class="beacon">🚨</div>' : "";
  return L.divIcon({
    className: "",
    iconSize: [v.w, v.h],
    iconAnchor: [v.w / 2, v.h / 2],
    html:
      '<div class="car-view ' + cls +
      '" style="transform:rotate(' + rot + 'deg)">' +
      '<img src="' + v.img + '">' + beacon + "</div>"
  });
}

export function refreshIcon(v) {
  return makeIcon(v);
}

export function createVehicleMarker(v, onClick) {
  v.marker = L.marker([v.edge.a.lat, v.edge.a.lon], {
    icon: makeIcon(v),
    keyboard: false,
    zIndexOffset: 500
  }).addTo(layers.vehicles);

  v.marker.on("click", () => onClick(v));
}

export function updateVehicleMarker(v) {
  if (!v.marker || !v.edge) return;
  const a = v.edge.a;
  const b = v.edge.b;
  const lat = a.lat + (b.lat - a.lat) * v.t;
  const lon = a.lon + (b.lon - a.lon) * v.t;
  v.marker.setLatLng([lat, lon]);

  if (v.kind === "bus") return;

  const box = v.marker.getElement();
  const view = box && box.querySelector(".car-view");
  if (view) view.style.transform = "rotate(" + v.edge.bearing + "deg)";
}

export function refreshVehicleMarkers() {
  for (const v of state.vehicles) {
    if (v.marker) v.marker.setIcon(makeIcon(v));
  }
}

export function removeVehicleMarker(v) {
  if (v.marker) layers.vehicles.removeLayer(v.marker);
}
