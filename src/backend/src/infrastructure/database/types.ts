import type { TrackArtist, TrackStatusEnum } from "@spotiarr/shared";

/**
 * Type-safe helpers for Prisma JSON field conversions
 */

/**
 * Converts TrackArtist[] to Prisma JSON input type
 */
/**
 * Converts TrackArtist[] to Prisma string input type (serialized JSON)
 */
export function trackArtistsToJson(artists: TrackArtist[] | undefined | null): string | null {
  if (!artists) {
    return null;
  }
  try {
    return JSON.stringify(artists);
  } catch (e) {
    console.error("Error serializing artists", e);
    return null;
  }
}

/**
 * Converts Prisma string output (serialized JSON) to TrackArtist[]
 */
export function jsonToTrackArtists(jsonString: unknown): TrackArtist[] | undefined {
  if (typeof jsonString !== "string") {
    return undefined;
  }

  try {
    const json = JSON.parse(jsonString);

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
  } catch (e) {
    console.error("Error parsing artists JSON", e);
    return undefined;
  }
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
