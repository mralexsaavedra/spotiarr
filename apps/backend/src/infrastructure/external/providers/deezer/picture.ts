import { upscaleDeezerImage } from "@/domain/helpers/deezer-image.helper";
import type { DeezerArtist } from "./deezer.client";

export { upscaleDeezerImage };

export function pickBestDeezerArtistPicture(artist: DeezerArtist): string | null {
  return (
    upscaleDeezerImage(artist.picture_xl) ??
    upscaleDeezerImage(artist.picture_big) ??
    upscaleDeezerImage(artist.picture_medium) ??
    upscaleDeezerImage(artist.picture) ??
    null
  );
}
