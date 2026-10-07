# AUTONOMOUS CITY — Ashoka Marg v2

This version fixes the earlier road rendering and vehicle behavior.

## Run

    cd C:\Users\admin\Desktop\autonomous-city
    python -m http.server 8000

Open:

    http://localhost:8000

Do NOT run `game.js` with Node.js.

## Improvements

### Satellite basemap
The app now starts with Esri World Imagery satellite/aerial tiles. A button lets you switch between satellite imagery and the normal OpenStreetMap street basemap. Our OSM-derived road geometry and vehicles remain visible on top.

### 1. Full OSM road geometry
The Overpass request uses `out body geom`, and each OSM way is drawn using its complete geometry. Curves and bends therefore match the map instead of drawing the network from isolated straight graph segments.

### 2. Better vehicle visuals
Cars use custom SVG sprites with windows, lights and wheels. They rotate according to the road segment bearing.

### 3. Randomized traffic
Every car has an individual:
- cruising speed
- acceleration
- braking strength
- junction caution
- small continuous speed variation

### 4. More natural routing
At each junction cars prefer a direction close to their current heading, so they don't randomly make absurd U-turn-like choices at every node.


## Next
- proper lane geometry
- vehicle following across adjacent segments
- traffic lights placed on OSM intersections
- adaptive signal controller
- A* emergency routing
- MLP model for autonomous decisions
- congestion heatmap


### v3.1 fix — road graph / car spawning
The Overpass response is now parsed correctly when using `out body geom`. The graph is built directly from each way's `nodes` + `geometry`, so cars have real connected edges to spawn on. The console prints the loaded way/node/edge counts for debugging.

### Overpass timeout fallback
Public Overpass servers can return HTTP 504 under load for expensive geographic
queries. This version uses a faster bounding-box filter and tries progressively
smaller map areas plus multiple public Overpass instances. A 504 therefore no
longer immediately prevents the simulation from starting.


## v6: reliable local OSM downloader

The browser no longer calls Overpass directly.

`server.py` downloads a small Ashoka Marg bounding box from the official
OpenStreetMap map-data endpoint, parses the XML, filters road ways, and exposes:

    GET /api/roads

This avoids the public Overpass timeout problem and avoids browser-side CORS
issues because the browser talks to localhost.

### Start

    cd C:\Users\admin\Desktop\autonomous-city
    python server.py

Then open:

    http://localhost:8000

Do not run `game.js` with Node.js.

### Why this works better

OpenStreetMap's map endpoint accepts a bounding box and returns nodes plus ways
needed to reconstruct the road geometry. The project uses a deliberately small
bbox around Ashoka Marg so the request remains lightweight. The OSM API
documentation defines the `map` endpoint as `GET /api/0.6/map?bbox=left,bottom,right,top`
and documents bbox limits; see the OpenStreetMap API documentation.
