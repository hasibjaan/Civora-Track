import type { z } from "zod";

import type {
  AnalysisSchema,
  CategorySchema,
  HistoryEntrySchema,
  LocationSchema,
  NewReportSchema,
  PhotoSchema,
  PriorityFactorSchema,
  PriorityLevelSchema,
  ReportSchema,
  StatusSchema,
  TeamSchema,
} from "./schemas";

export type Category = z.infer<typeof CategorySchema>;
export type Status = z.infer<typeof StatusSchema>;
export type PriorityLevel = z.infer<typeof PriorityLevelSchema>;
export type PriorityFactor = z.infer<typeof PriorityFactorSchema>;
export type Team = z.infer<typeof TeamSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type Photo = z.infer<typeof PhotoSchema>;
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;
export type Analysis = z.infer<typeof AnalysisSchema>;
export type Report = z.infer<typeof ReportSchema>;
export type NewReport = z.infer<typeof NewReportSchema>;

/** The citizen's answers, without the photo bytes (which are stored separately). */
export type ReportDetails = Omit<NewReport, "imageUrl">;
