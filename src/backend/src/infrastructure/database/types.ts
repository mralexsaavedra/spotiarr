import { Prisma } from "@prisma/client";
import type { TrackArtist, TrackStatusEnum } from "@spotiarr/shared";

/**
 * Type-safe helpers for Prisma JSON field conversions
 */

/**
 * Converts TrackArtist[] to Prisma JSON input type
 */
export function trackArtistsToJson(
  artists: TrackArtist[] | undefined | null,
): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
  if (artists === undefined) {
    return Prisma.JsonNull;
  }
  if (artists === null) {
    return Prisma.JsonNull;
  }
  return artists as unknown as Prisma.InputJsonValue;
}

/**
 * Converts Prisma JSON output to TrackArtist[]
 */
export function jsonToTrackArtists(json: unknown): TrackArtist[] | undefined {
  if (json === null || json === undefined) {
    return undefined;
  }

  // Type guard to validate the structure
  if (!Array.isArray(json)) {
    console.warn("Invalid artists JSON format: expected array", json);
    return undefined;
  }

  // Validate each artist object
  const isValidArtist = (item: unknown): item is TrackArtist => {
    return (
      typeof item === "object" && item !== null && "name" in item && typeof item.name === "string"
    );
  };

  if (!json.every(isValidArtist)) {
    console.warn("Invalid artist object in array", json);
    return undefined;
  }

  return json as TrackArtist[];
}

/**
 * Type guard for TrackStatusEnum
 */
export function isValidTrackStatus(status: unknown): status is TrackStatusEnum {
  const validStatuses = ["new", "searching", "queued", "downloading", "completed", "error"];
  return typeof status === "string" && validStatuses.includes(status);
}

/**
 * Safely converts unknown status to TrackStatusEnum
 */
export function toTrackStatus(status: unknown): TrackStatusEnum {
  if (isValidTrackStatus(status)) {
    return status;
  }
  console.warn(`Invalid track status: ${status}, defaulting to 'new'`);
  return "new" as TrackStatusEnum;
}
