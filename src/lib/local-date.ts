/** Calendar dates follow the user's device, not UTC midnight. Stored instants stay UTC. */
export function localDate(value = new Date()): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
export const localMonth = (value = new Date()) => localDate(value).slice(0, 7);
export const momentDay = (value: { calendarDate?: string; occurredAt: string }) => value.calendarDate ?? value.occurredAt.slice(0, 10);
