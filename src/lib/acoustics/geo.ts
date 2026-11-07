export const SPEED_OF_SOUND = 343;

export const REGION = { name: "Metro Vancouver", latMin: 49.0, latMax: 49.4, lonMin: -123.3, lonMax: -122.55 };
export type Region = typeof REGION;

export interface FlightSample { t: number; lat: number; lon: number; alt: number }
export interface FlightTrack { icao24: string; callsign: string; samples: FlightSample[] }

/** One aircraft flyover measured from the recording. Times in the clip are seconds from clip start. */
export interface DopplerEvent {
  id: number;
  tCpa: number; // reception time of closest approach, seconds into the clip
  f0: number; // rest (closest-approach) frequency, Hz
  speed: number; // m/s
  slant: number; // closest-approach slant distance, m
  rms: number; // relative frequency residual of the fit
  start: number;
  end: number;
  coversCpa: boolean;
  snr: number;
  sigmaLogD: number;
  sigmaLogV: number;
  track: { t: number; f: number }[];
}

export function makeProjection(lat0: number, lon0: number) {
  const mLat = 111200;
  const mLon = 111320 * Math.cos((lat0 * Math.PI) / 180);
  return {
    toXY: (lat: number, lon: number) => ({ x: (lon - lon0) * mLon, y: (lat - lat0) * mLat }),
    toLatLon: (x: number, y: number) => ({ lat: lat0 + y / mLat, lon: lon0 + x / mLon }),
  };
}

export function distanceM(aLat: number, aLon: number, bLat: number, bLon: number) {
  const p = makeProjection(aLat, aLon).toXY(bLat, bLon);
  return Math.hypot(p.x, p.y);
}
