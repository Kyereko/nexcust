import 'server-only';
import regions from './geo/ghana-regions.json';

/**
 * Ghana's 16 regions as SVG paths. Equirectangular projection corrected for Ghana's mid latitude, which keeps
 * shapes and distances true enough at national scale and lets the client place points with the same formula.
 */
export interface Projection { minLon: number; maxLat: number; k: number; kx: number; width: number; height: number; pad: number }
export interface RegionShape { name: string; d: string; box: [number, number, number, number] }

type Ring = number[][];
const features = (regions as unknown as { features: Array<{ properties: { name: string }; geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: Ring[] | Ring[][] } }> }).features;

let cached: { shapes: RegionShape[]; projection: Projection } | null = null;

export function ghanaMap(): { shapes: RegionShape[]; projection: Projection } {
  if (cached) return cached;
  const polys = (g: (typeof features)[number]['geometry']) => (g.type === 'Polygon' ? [g.coordinates as Ring[]] : (g.coordinates as Ring[][]));
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const f of features) for (const poly of polys(f.geometry)) for (const [lon, lat] of poly[0]) {
    minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon); minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
  }
  const pad = 6, width = 480, cos = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const k = (width - 2 * pad) / ((maxLon - minLon) * cos), kx = k * cos;
  const height = Math.round((maxLat - minLat) * k + 2 * pad);
  const projection: Projection = { minLon, maxLat, k, kx, width, height, pad };
  const xy = ([lon, lat]: number[]) => `${(pad + (lon - minLon) * kx).toFixed(1)},${(pad + (maxLat - lat) * k).toFixed(1)}`;
  const shapes = features.map((f) => {
    const outer = polys(f.geometry).flatMap((poly) => poly[0]);
    const xs = outer.map(([lon]) => pad + (lon - minLon) * kx), ys = outer.map(([, lat]) => pad + (maxLat - lat) * k);
    return {
      name: f.properties.name,
      d: polys(f.geometry).map((poly) => poly.map((ring) => `M${ring.map(xy).join('L')}Z`).join('')).join(''),
      box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] as [number, number, number, number],
    };
  });
  cached = { shapes, projection };
  return cached;
}
