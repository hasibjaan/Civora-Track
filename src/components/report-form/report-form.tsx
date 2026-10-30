"use client";

import { useState, type FormEvent } from "react";
import { z } from "zod";

import { CATEGORY_LABELS } from "@/domain/categories";
import { CATEGORY_IDS, NewReportSchema } from "@/domain/schemas";
import type { Category } from "@/domain/types";
import { prepareImageForUpload } from "@/lib/image";
import { toFieldErrors } from "@/lib/validation";

import { ErrorSummary } from "./error-summary";
import { FieldError, FieldLabel, inputClassName } from "./form-field";
import { ImageField } from "./image-field";
import { LocationField, type LocationValue } from "./location-field";
import { SubmissionConfirmation } from "./submission-confirmation";

const CreatedResponseSchema = z.object({ id: z.string().min(1) });
const ErrorResponseSchema = z.object({
  error: z.string(),
  fieldErrors: z.record(z.string(), z.string()).optional(),
});

const MAX_DESCRIPTION_LENGTH = 1000;
const EMPTY_LOCATION: LocationValue = { lat: null, lng: null, address: "" };
const PHOTO_READ_ERROR = "We could not read this photo. Try a JPEG or PNG.";

/** Maps validation keys (from the shared schema) to the id of the input that has the problem. */
const FIELD_IDS: Record<string, string> = {
  description: "description",
  category: "category",
  "location.lat": "lat",
  "location.lng": "lng",
  "location.address": "address",
  imageUrl: "photo",
};

export function ReportForm() {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION);
  const [photo, setPhoto] = useState<File | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  function updateLocation(patch: Partial<LocationValue>) {
    setLocation((current) => ({ ...current, ...patch }));
  }

  function resetForm() {
    setDescription("");
    setCategory("");
    setLocation(EMPTY_LOCATION);
    setPhoto(null);
    setErrors({});
    setSubmitError(null);
    setSubmittedId(null);
  }

  function showErrors(nextErrors: Record<string, string>) {
    setErrors(nextErrors);
    const firstField = Object.keys(nextErrors)[0];
    const fieldId = firstField ? FIELD_IDS[firstField] : undefined;
    if (fieldId) document.getElementById(fieldId)?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setErrors({});

    let imageUrl: string | undefined;
    if (photo) {
      try {
        imageUrl = await prepareImageForUpload(photo);
      } catch {
        showErrors({ imageUrl: PHOTO_READ_ERROR });
        return;
      }
    }

    // Same schema the API route uses, so client and server always agree on what is valid.
    const parsed = NewReportSchema.safeParse({ description, category, location, imageUrl });
    if (!parsed.success) {
      showErrors(toFieldErrors(parsed.error.issues));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body: unknown = await response.json();

      if (!response.ok) {
        const failure = ErrorResponseSchema.safeParse(body);
        if (failure.success) {
          setSubmitError(failure.data.error);
          showErrors(failure.data.fieldErrors ?? {});
        } else {
          setSubmitError("Something went wrong. Please try again.");
        }
        return;
      }

      setSubmittedId(CreatedResponseSchema.parse(body).id);
    } catch {
      setSubmitError("Could not reach the server. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submittedId) {
    return <SubmissionConfirmation reportId={submittedId} onSubmitAnother={resetForm} />;
  }

  const summaryItems = Object.entries(errors).map(([key, message]) => ({
    message,
    fieldId: FIELD_IDS[key],
  }));

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-7">
      <ErrorSummary items={summaryItems} />

      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="description" required>
          What is the problem?
        </FieldLabel>
        <textarea
          id="description"
          rows={4}
          maxLength={MAX_DESCRIPTION_LENGTH}
          placeholder="For example: the drain outside our gate is blocked and water floods the road."
          className={inputClassName}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          aria-required="true"
          aria-invalid={Boolean(errors.description)}
          aria-describedby="description-error description-count"
        />
        <div className="flex items-start justify-between gap-3">
          <FieldError id="description-error" message={errors.description} />
          <p
            id="description-count"
            className="ml-auto shrink-0 text-sm text-zinc-600 dark:text-zinc-400"
          >
            {description.length}/{MAX_DESCRIPTION_LENGTH}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="category" required>
          Category
        </FieldLabel>
        <select
          id="category"
          className={inputClassName}
          value={category}
          onChange={(event) => setCategory(event.target.value as Category | "")}
          aria-required="true"
          aria-invalid={Boolean(errors.category)}
          aria-describedby="category-error"
        >
          <option value="">Choose a category</option>
          {CATEGORY_IDS.map((id) => (
            <option key={id} value={id}>
              {CATEGORY_LABELS[id]}
            </option>
          ))}
        </select>
        <FieldError id="category-error" message={errors.category} />
      </div>

      <LocationField value={location} onChange={updateLocation} errors={errors} />

      <ImageField file={photo} onChange={setPhoto} error={errors.imageUrl} />

      {submitError && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-base text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
        >
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="min-h-14 w-full rounded-lg bg-zinc-900 px-4 py-3 text-lg font-semibold text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/40 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {isSubmitting ? "Submitting..." : "Submit report"}
      </button>
    </form>
  );
}
