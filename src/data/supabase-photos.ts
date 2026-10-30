import "server-only";

import { decodePhoto, photoFileName, photoFileNames, type PhotoStore } from "./photos";
import { SupabaseRequestError, type FailureCodes, type ServerSupabase } from "./supabase-client";

/** The private Storage bucket made by the migration in supabase/migrations. */
export const PHOTO_BUCKET = "report-photos";

/**
 * Stores report photos in a private Supabase Storage bucket. The bucket has no public link, so a
 * photo can only be fetched through the app's photo route, which looks up the report first.
 */
export function createSupabasePhotoStore(client: ServerSupabase): PhotoStore {
  const bucket = () => client.storage.from(PHOTO_BUCKET);

  return {
    async save(reportId, dataUrl) {
      const { mimeType, bytes } = decodePhoto(dataUrl);
      const { error } = await bucket().upload(photoFileName(reportId, mimeType), bytes, {
        contentType: mimeType,
        // A stored photo is never replaced. Every report has its own tracking ID.
        upsert: false,
      });
      if (error) throw new SupabaseRequestError("save a photo", codesOf(error));
      return { mimeType };
    },

    async read(reportId, mimeType) {
      const { data, error } = await bucket().download(photoFileName(reportId, mimeType));
      if (error) throw new SupabaseRequestError("read a photo", codesOf(error));
      return Buffer.from(await data.arrayBuffer());
    },

    async remove(reportId) {
      const { error } = await bucket().remove(photoFileNames(reportId));
      if (error) throw new SupabaseRequestError("remove a photo", codesOf(error));
    },
  };
}

function codesOf(error: { status?: number; statusCode?: string }): FailureCodes {
  return { code: error.statusCode, status: error.status };
}
