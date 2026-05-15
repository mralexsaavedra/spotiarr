import type { ArtistRelease } from "@spotiarr/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/contexts/ToastContext";
import { Path } from "@/routes/routes";
import { artistService } from "@/services/artist.service";
import { usePlaylistsQuery } from "./queries/usePlaylistsQuery";

const albumKey = (album: Pick<ArtistRelease, "artistId" | "albumId">): string =>
  `${album.artistId}:${album.albumId}`;

export const useAlbumPreviewNavigation = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const { data: playlists = [] } = usePlaylistsQuery();
  const [resolvingAlbumKeys, setResolvingAlbumKeys] = useState<Set<string>>(new Set());

  const navigateToSpotifyUrl = (spotifyUrl: string) => {
    const existingPlaylist = playlists.find((playlist) => playlist.spotifyUrl === spotifyUrl);

    if (existingPlaylist) {
      navigate(Path.PLAYLIST_DETAIL.replace(":id", existingPlaylist.id));
      return;
    }

    navigate(`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(spotifyUrl)}`);
  };

  const navigateToAlbumPreview = async (album: ArtistRelease) => {
    if (album.spotifyUrl) {
      navigateToSpotifyUrl(album.spotifyUrl);
      return;
    }

    const key = albumKey(album);

    if (!album.artistName || !album.albumName || resolvingAlbumKeys.has(key)) {
      return;
    }

    setResolvingAlbumKeys((current) => new Set(current).add(key));

    try {
      const result = await artistService.materializeAlbumSpotifyUrl(album.artistId, album.albumId, {
        artistName: album.artistName,
        albumName: album.albumName,
      });
      navigateToSpotifyUrl(result.spotifyUrl);
    } catch (error) {
      console.error("[useAlbumPreviewNavigation] materializeAlbumSpotifyUrl", error);
      toast.error(t("artist.errors.materializeSpotifyUrl"));
    } finally {
      setResolvingAlbumKeys((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  };

  const isResolvingAlbum = (album: Pick<ArtistRelease, "artistId" | "albumId">) =>
    resolvingAlbumKeys.has(albumKey(album));

  return { navigateToAlbumPreview, isResolvingAlbum };
};
