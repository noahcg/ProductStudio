/** Calendar dates stay local; do not parse YYYY-MM-DD as UTC. */
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function validateSchedule(date: unknown, time: unknown): string | null {
  if (date !== undefined && date !== "") {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Choose a valid scheduled date.";
    const parsed = new Date(`${date}T12:00:00`);
    if (!Number.isFinite(parsed.getTime()) || dateKey(parsed) !== date) return "Choose a valid scheduled date.";
  }
  if (time !== undefined && time !== "") {
    if (!date) return "Choose a date before setting a time.";
    if (typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return "Choose a valid scheduled time.";
  }
  return null;
}
