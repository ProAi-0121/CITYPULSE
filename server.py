from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from urllib.request import Request, urlopen
import json
import math
import os
import threading
import time
import xml.etree.ElementTree as ET

HOST = "127.0.0.1"
PORT = 8000

# Approximate center for Ashoka Marg, Nashik.
CENTER_LAT = 19.98093
CENTER_LON = 73.79544

# About ~2.4 km x 2.2 km. Small enough for OSM map API, large enough
# to show the useful Ashoka Marg road network.
HALF_LAT = 0.0105
HALF_LON = 0.0120

OSM_URL = "https://api.openstreetmap.org/api/0.6/map"


def bbox():
    south = CENTER_LAT - HALF_LAT
    west = CENTER_LON - HALF_LON
    north = CENTER_LAT + HALF_LAT
    east = CENTER_LON + HALF_LON
    return west, south, east, north


def download_osm():
    west, south, east, north = bbox()
    url = (
        f"{OSM_URL}?bbox="
        f"{west:.6f},{south:.6f},{east:.6f},{north:.6f}"
    )

    req = Request(
        url,
        headers={
            "User-Agent": "AutonomousCity-OOPCG/1.0 (educational project)"
        },
    )

    with urlopen(req, timeout=60) as response:
        content_type = response.headers.get("content-type", "")
        raw = response.read()

    if not raw:
        raise RuntimeError("OpenStreetMap returned an empty response.")

    # The OSM map endpoint normally returns XML.
    if "xml" not in content_type.lower() and not raw.lstrip().startswith(b"<"):
        raise RuntimeError(
            f"Unexpected OSM response type: {content_type or 'unknown'}"
        )

    return raw


def parse_osm(raw):
    root = ET.fromstring(raw)

    nodes = {}
    all_ways = []

    for node in root.findall("node"):
        node_id = int(node.attrib["id"])
        nodes[node_id] = {
            "id": node_id,
            "lat": float(node.attrib["lat"]),
            "lon": float(node.attrib["lon"]),
        }

    allowed = {
        "primary",
        "secondary",
        "tertiary",
        "unclassified",
        "residential",
        "service",
    }

    # OSM's map endpoint includes nodes referenced by ways, including some
    # outside the exact requested bbox. Keep all nodes because ways need them.
    for way in root.findall("way"):
        tags = {}
        for tag in way.findall("tag"):
            k = tag.attrib.get("k")
            v = tag.attrib.get("v")
            if k:
                tags[k] = v

        if tags.get("highway") not in allowed:
            continue

        refs = []
        for nd in way.findall("nd"):
            try:
                refs.append(int(nd.attrib["ref"]))
            except (TypeError, ValueError):
                pass

        if len(refs) < 2:
            continue

        # Keep only ways for which we have enough geometry nodes.
        if sum(1 for ref in refs if ref in nodes) < 2:
            continue

        all_ways.append(
            {
                "id": int(way.attrib["id"]),
                "nodes": refs,
                "tags": tags,
            }
        )

    # Reduce payload: only send nodes referenced by selected road ways.
    used = set()
    for way in all_ways:
        used.update(way["nodes"])

    road_nodes = [nodes[node_id] for node_id in used if node_id in nodes]
    road_nodes.sort(key=lambda n: n["id"])

    return {
        "center": [CENTER_LAT, CENTER_LON],
        "bbox": list(bbox()),
        "nodes": road_nodes,
        "ways": all_ways,
    }


class Handler(SimpleHTTPRequestHandler):
    cache = None
    cache_time = 0
    cache_seconds = 300
    lock = threading.Lock()

    def end_headers(self):
        # Never cache app files: they change during development.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_json(self, payload, status=200):
        raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        path = urlparse(self.path).path

        if path == "/api/roads":
            try:
                with self.lock:
                    if (
                        self.cache is None
                        or time.time() - self.cache_time > self.cache_seconds
                    ):
                        raw = download_osm()
                        self.cache = parse_osm(raw)
                        self.cache_time = time.time()

                self.send_json(self.cache)
            except Exception as exc:
                print("[OSM ERROR]", repr(exc))
                self.send_json(
                    {
                        "error": (
                            "Could not download Ashoka Marg road data from "
                            f"OpenStreetMap: {exc}"
                        )
                    },
                    status=502,
                )
            return

        # Normal files: index.html, game.js, style.css, etc.
        super().do_GET()

    def log_message(self, format, *args):
        print("[HTTP]", format % args)


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f"Autonomous City running at http://localhost:{PORT}")
    print(
        f"OSM bbox: {bbox()[1]:.6f},{bbox()[0]:.6f} "
        f"to {bbox()[3]:.6f},{bbox()[2]:.6f}"
    )
    print("Press Ctrl+C to stop.")

    server = ThreadingHTTPServer((HOST, PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
    finally:
        server.server_close()
