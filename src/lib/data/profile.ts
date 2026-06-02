import type { Profile, WeeklySummary } from "../domain";

/** The single studio owner. (No multi-user in Phase 2.) */
export const profile: Profile = {
  name: "Noah",
  fullName: "Noah Glushien",
  unreadNotifications: 3,
};

/** Studio footer banner figures. */
export const weeklySummary: WeeklySummary = {
  updates: 3,
  products: 2,
};
