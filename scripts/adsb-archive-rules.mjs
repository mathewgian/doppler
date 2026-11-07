// Shared, explicit import policy; source requests are serialized, never polled live.
export const REQUEST_INTERVAL_MS = 5000;
export const METRO_VANCOUVER = Object.freeze({ south: 49.0, north: 49.4, west: -123.3, east: -122.55 });

export function inMetroVancouver(lat, lon) {
  const b = METRO_VANCOUVER;
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= b.south && lat <= b.north && lon >= b.west && lon <= b.east;
}

export function requestDelay(lastStarted, now) {
  return Math.max(0, REQUEST_INTERVAL_MS - (now - lastStarted));
}

export function pastMonthDays(end = new Date()) {
  const stop = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  const start = new Date(stop);
  start.setUTCDate(start.getUTCDate() - 30);
  const days = [];
  for (const day = new Date(start); day < stop; day.setUTCDate(day.getUTCDate() + 1)) {
    days.push(day.toISOString().slice(0, 10));
  }
  return days;
}