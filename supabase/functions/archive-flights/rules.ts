export const MAX_WINDOW_SECONDS = 1320;
export const MAX_ROWS = 30000;
export function validWindow(begin: unknown, end: unknown, now = Date.now() / 1000): boolean {
  return typeof begin === "number" && typeof end === "number" &&
    Number.isFinite(begin) && Number.isFinite(end) && begin > 0 && end > begin &&
    end - begin <= MAX_WINDOW_SECONDS && end <= now;
}
export function requiredDays(begin: number, end: number): string[] {
  const days: string[] = [];
  for (let t = Math.floor(begin / 86400) * 86400; t < end; t += 86400) {
    days.push(new Date(t * 1000).toISOString().slice(0, 10));
  }
  return days;
}