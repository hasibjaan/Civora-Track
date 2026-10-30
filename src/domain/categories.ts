import type { Category } from "./types";

/** Citizen-facing labels. Keys are the stored category IDs. */
export const CATEGORY_LABELS: Record<Category, string> = {
  waterlogging: "Waterlogging",
  drainage: "Blocked or open drain",
  road_damage: "Road damage",
  streetlight: "Streetlight",
  waste: "Garbage and waste",
  other: "Other",
};
