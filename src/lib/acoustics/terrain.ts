import { REGION } from "./geo";

export const TERRAIN_ATTRIBUTION = "Mapzen Terrain Tiles · Canada terrain contains information licensed under the Open Government Licence – Canada; global terrain courtesy of USGS and NOAA.";
export interface TerrainGrid { latMin: number; latMax: number; lonMin: number; lonMax: number; rows: number; cols: number; values: number[] }
export function terrainElevation(grid: TerrainGrid, lat: number, lon: number): number {
  if (lat < grid.latMin || lat > grid.latMax || lon < grid.lonMin || lon > grid.lonMax) throw new Error("Outside terrain coverage.");
  const x = (lon - grid.lonMin) / (grid.lonMax - grid.lonMin) * (grid.cols - 1), y = (lat - grid.latMin) / (grid.latMax - grid.latMin) * (grid.rows - 1);
  const ix = Math.min(grid.cols - 2, Math.floor(x)), iy = Math.min(grid.rows - 2, Math.floor(y));
  const dx = x - ix, dy = y - iy;
  const v = (xx: number, yy: number) => grid.values[yy * grid.cols + xx];
  // Negative coastal bathymetry is water, not a below-sea-level microphone.
  return Math.max(0, (v(ix, iy) * (1 - dx) + v(ix + 1, iy) * dx) * (1 - dy) + (v(ix, iy + 1) * (1 - dx) + v(ix + 1, iy + 1) * dx) * dy);
}
let cached: TerrainGrid | undefined;
export async function loadTerrain(): Promise<TerrainGrid> {
  if (cached) return cached;
  const response = await fetch("/terrain/metro-vancouver.json");
  if (!response.ok) throw new Error("Terrain data is unavailable. No terrain-aware location was calculated.");
  const grid = await response.json() as TerrainGrid;
  if (grid.latMin !== REGION.latMin || grid.latMax !== REGION.latMax || grid.lonMin !== REGION.lonMin || grid.lonMax !== REGION.lonMax || !Number.isInteger(grid.rows) || !Number.isInteger(grid.cols) || grid.rows < 2 || grid.cols < 2 || grid.values?.length !== grid.rows * grid.cols || !grid.values.every(Number.isFinite)) throw new Error("Terrain data could not be validated.");
  cached = grid;
  return grid;
}