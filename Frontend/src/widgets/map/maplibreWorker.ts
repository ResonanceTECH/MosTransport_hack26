import { setWorkerUrl } from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

// MapLibre derives its worker path from `import.meta.url` of its own module at
// runtime; after bundling that file does not exist, so tiles and GeoJSON layers
// never load. Let Vite bundle the worker (with its shared chunk) and point
// MapLibre at the emitted asset before any map is created.
setWorkerUrl(maplibreWorkerUrl)
