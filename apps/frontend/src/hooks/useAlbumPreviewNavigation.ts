import type { ArtistRelease } from "@spotiarr/shared";
import { useNavigate } from "react-router-dom";
import { Path } from "@/routes/routes";
import { usePlaylistsQuery } from "./queries/usePlaylistsQuery";

export const useAlbumPreviewNavigation = () => {
  const navigate = useNavigate();
  const { data: playlists = [] } = usePlaylistsQuery();

  const navigateToSpotifyUrl = (spotifyUrl: string) => {
    const existingPlaylist = playlists.find((playlist) => playlist.spotifyUrl === spotifyUrl);

    if (existingPlaylist) {
      navigate(Path.PLAYLIST_DETAIL.replace(":id", existingPlaylist.id));
      return;
    }

    navigate(`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(spotifyUrl)}`);
  };

  const navigateToAlbumPreview = (album: ArtistRelease) => {
    if (album.spotifyUrl) {
      navigateToSpotifyUrl(album.spotifyUrl);
      return;
    }

    // No spotifyUrl (Deezer-sourced album): navigate directly to the AlbumDetail view.
    navigate(
      Path.ALBUM_DETAIL.replace(":artistId", album.artistId).replace(":albumId", album.albumId),
    );
  };

  return { navigateToAlbumPreview };
};
