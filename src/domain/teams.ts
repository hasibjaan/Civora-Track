import type { Category, Team } from "./types";

/**
 * Response teams. These are placeholders: the names say "(mock)" so no one mistakes them for
 * real council departments. In production, these would come from the council's own directory.
 */
export const TEAM_LABELS: Record<Team, string> = {
  roads: "Roads team (mock)",
  drainage: "Drainage team (mock)",
  streetlights: "Streetlight team (mock)",
  sanitation: "Sanitation team (mock)",
  water: "Water supply team (mock)",
};

/** The team that usually handles each category. Preselected when an officer assigns a report. */
export const TEAM_FOR_CATEGORY: Record<Category, Team> = {
  waterlogging: "drainage",
  drainage: "drainage",
  road_damage: "roads",
  streetlight: "streetlights",
  waste: "sanitation",
  other: "roads",
};
