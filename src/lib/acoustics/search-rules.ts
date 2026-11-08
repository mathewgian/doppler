export const MAX_RECORDING_SECONDS = 1800;
export const CLOCK_WINDOWS = [5, 30, 120, 300, 3600, 43200];
export const MAX_SEARCH_POSITIONS = 250000;
export function archiveWindows(begin: number, end: number): [number, number][] {
  const windows: [number, number][] = [];
  for (let t = begin; t < end; t += 1320) windows.push([t, Math.min(end, t + 1320)]);
  return windows;
}