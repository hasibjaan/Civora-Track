import { z } from "zod";

// Zod normally compiles validators with `new Function` when the browser allows it. A strict
// Content Security Policy blocks that and reports a violation, even though zod catches the
// error. Interpreted validation is fast enough for these small forms, so turn compilation off.
z.config({ jitless: true });

// Single source of truth for the shapes shared by the UI, API routes, and storage.
// Types are inferred from these schemas in types.ts, so the two cannot drift apart.

export const CATEGORY_IDS = [
  "waterlogging",
  "drainage",
  "road_damage",
  "streetlight",
  "waste",
  "other",
] as const;

export const STATUS_IDS = [
  "submitted",
  "triaged",
  "assigned",
  "in_progress",
  "resolved",
  "rejected",
] as const;

export const PRIORITY_LEVELS = ["urgent", "high", "medium", "low"] as const;

/** Response teams. These are placeholders for the real council departments. */
export const TEAM_IDS = ["roads", "drainage", "streetlights", "sanitation", "water"] as const;

/** Tracking IDs are "RPT-" plus 4 to 12 hex digits. Checked before any lookup or file access. */
export const TRACKING_ID_PATTERN = /^RPT-[0-9A-F]{4,12}$/;

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
/** Base64 grows data by about a third, plus room for the "data:...;base64," prefix. */
export const MAX_IMAGE_DATA_URL_LENGTH = Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 64;
const IMAGE_DATA_URL_PATTERN = new RegExp(
  `^data:(${IMAGE_MIME_TYPES.join("|")});base64,[A-Za-z0-9+/]+={0,2}$`,
);

export const CategorySchema = z.enum(CATEGORY_IDS, { error: "Choose a problem category." });
export const StatusSchema = z.enum(STATUS_IDS);
export const PriorityLevelSchema = z.enum(PRIORITY_LEVELS);
export const TeamSchema = z.enum(TEAM_IDS);

const IsoTimestampSchema = z.iso.datetime();

export const LocationSchema = z.object({
  lat: z.number({ error: "Add your location." }).min(-90).max(90),
  lng: z.number({ error: "Add your location." }).min(-180).max(180),
  address: z.string().trim().min(1).max(200).optional(),
});

export const PhotoSchema = z.object({
  mimeType: z.enum(IMAGE_MIME_TYPES),
});

/** Who made a change. Citizens are "citizen"; officers are the signed-in officer's name. */
const ActorSchema = z.string().min(1).max(100);
const NoteSchema = z.string().trim().min(1).max(300);

export const HistoryEntrySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("created"),
    at: IsoTimestampSchema,
    actor: ActorSchema,
  }),
  z.object({
    type: z.literal("status_changed"),
    at: IsoTimestampSchema,
    actor: ActorSchema,
    from: StatusSchema,
    to: StatusSchema,
    note: NoteSchema.optional(),
  }),
  z.object({
    type: z.literal("team_assigned"),
    at: IsoTimestampSchema,
    actor: ActorSchema,
    team: TeamSchema,
  }),
  z.object({
    type: z.literal("category_changed"),
    at: IsoTimestampSchema,
    actor: ActorSchema,
    from: CategorySchema,
    to: CategorySchema,
  }),
  z.object({
    type: z.literal("priority_overridden"),
    at: IsoTimestampSchema,
    actor: ActorSchema,
    level: PriorityLevelSchema,
    reason: NoteSchema,
  }),
  z.object({
    type: z.literal("merged_into"),
    at: IsoTimestampSchema,
    actor: ActorSchema,
    primaryId: z.string().regex(TRACKING_ID_PATTERN),
  }),
]);

export const PriorityFactorSchema = z.object({
  factor: z.string().min(1),
  points: z.number(),
  reason: z.string().min(1),
});

export const AnalysisSchema = z.object({
  summary: z.string().min(1).max(300),
  suggestedCategory: CategorySchema,
  priority: z.object({
    score: z.number().min(0).max(100),
    level: PriorityLevelSchema,
    factors: z.array(PriorityFactorSchema),
  }),
  /** IDs of reports this one probably duplicates. Suggestions only; nothing is merged automatically. */
  duplicateOf: z.array(z.string()),
  method: z.enum(["llm", "rules"]),
  analyzedAt: IsoTimestampSchema,
});

export const ReportSchema = z.object({
  id: z.string().regex(TRACKING_ID_PATTERN),
  description: z.string().min(1).max(1000),
  category: CategorySchema,
  location: LocationSchema,
  status: StatusSchema,
  reportedAt: IsoTimestampSchema,
  /** The photo itself is stored as a file; the report only records its type. */
  photo: PhotoSchema.optional(),
  /** Set by an officer when this report is merged into another report. */
  mergedInto: z.string().regex(TRACKING_ID_PATTERN).optional(),
  assignedTeam: TeamSchema.optional(),
  /** An officer's own priority, which takes precedence over the calculated level. */
  priorityOverride: z.object({ level: PriorityLevelSchema, reason: NoteSchema }).optional(),
  analysis: AnalysisSchema.optional(),
  history: z.array(HistoryEntrySchema).min(1),
});

/** Input accepted from the citizen capture form. Validated on both the client and the server. */
export const NewReportSchema = z.object({
  description: z
    .string()
    .trim()
    .min(10, "Describe the problem in at least 10 characters.")
    .max(1000, "Keep the description under 1000 characters."),
  category: CategorySchema,
  location: LocationSchema.extend({
    address: z
      .string({ error: "Add a nearby landmark or street." })
      .trim()
      .min(3, "Add a nearby landmark or street.")
      .max(200, "Keep the landmark under 200 characters."),
  }),
  imageUrl: z
    .string()
    .regex(IMAGE_DATA_URL_PATTERN, "Attach a JPEG, PNG or WebP photo.")
    .max(MAX_IMAGE_DATA_URL_LENGTH, "This photo is too large. Try a smaller one.")
    .optional(),
});
