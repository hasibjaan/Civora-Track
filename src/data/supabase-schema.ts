/**
 * Types for the Supabase table, matching supabase/migrations/20261030120000_reports.sql.
 * Update both together. The shape follows the types `supabase gen types` would produce.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      reports: {
        Row: {
          id: string;
          /** A report as JSON. Always validated against ReportSchema before use. */
          report: Json;
          /** Raised by the database on every update. */
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          report: Json;
        };
        /** Only the report changes. The database sets the version and update time itself. */
        Update: {
          report: Json;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
  };
};
