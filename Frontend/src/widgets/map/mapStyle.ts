import type { StyleSpecification } from 'maplibre-gl'
import { appConfig } from '@/shared/config/env'

// CARTO raster tiles now answer with an "API KEY REQUIRED" placeholder image.
const DEFAULT_TILES = ['https://tile.openstreetmap.org/{z}/{x}/{y}.png']

/** Self-contained raster style.
 *
 * It needs no remote style JSON, glyphs or sprites, so the style is ready
 * immediately and the route/stop layers always render; if the tile server is
 * unreachable only the basemap picture is missing.
 */
function rasterStyle(): StyleSpecification {
  const tiles = appConfig.MAP_TILES_URL
    ? appConfig.MAP_TILES_URL.split(',').map((url) => url.trim()).filter(Boolean)
    : DEFAULT_TILES
  return {
    version: 8,
    sources: {
      basemap: {
        type: 'raster',
        tiles,
        tileSize: 256,
        maxzoom: 19,
        attribution: '© OpenStreetMap contributors',
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#EEF2F7' } },
      { id: 'basemap', type: 'raster', source: 'basemap' },
    ],
  }
}

/** A configured vector style URL wins; otherwise use the built-in raster style. */
export function resolveMapStyle(): string | StyleSpecification {
  return appConfig.MAP_STYLE_URL || rasterStyle()
}
