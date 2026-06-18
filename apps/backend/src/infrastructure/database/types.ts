import { TrackStatusEnum, type TrackArtist } from "@spotiarr/shared";
import { logger } from "@/infrastructure/logging/logger";

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
    logger.error({ component: "database-types", err: e }, "Error serializing artists");
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
      logger.warn(
        { component: "database-types", json },
        "Invalid artists JSON format: expected array",
      );
      return undefined;
    }

    // Validate each artist object
    const isValidArtist = (item: unknown): item is TrackArtist => {
      return (
        typeof item === "object" && item !== null && "name" in item && typeof item.name === "string"
      );
    };

    if (!json.every(isValidArtist)) {
      logger.warn({ component: "database-types" }, "Invalid artist object in array");
      return undefined;
    }

    return json as TrackArtist[];
  } catch (e) {
    logger.error({ component: "database-types", err: e }, "Error parsing artists JSON");
    return undefined;
  }
}

/**
 * Type guard for TrackStatusEnum
 */
function isValidTrackStatus(status: unknown): status is TrackStatusEnum {
  const validStatuses = Object.values(TrackStatusEnum);
  return typeof status === "string" && validStatuses.includes(status as TrackStatusEnum);
}

/**
 * Safely converts unknown status to TrackStatusEnum
 */
export function toTrackStatus(status: unknown): TrackStatusEnum {
  if (isValidTrackStatus(status)) {
    return status;
  }

  if (typeof status === "string") {
    const lowerStatus = status.toLowerCase();
    if (isValidTrackStatus(lowerStatus)) {
      return lowerStatus;
    }
  }

  logger.warn({ component: "database-types", status }, "Invalid track status, defaulting to 'new'");
  return TrackStatusEnum.New;
}
