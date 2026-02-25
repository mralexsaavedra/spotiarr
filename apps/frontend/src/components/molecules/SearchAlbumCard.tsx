import { ArtistRelease } from "@spotiarr/shared";
import { FC } from "react";
import { Image } from "../atoms/Image";

interface SearchAlbumCardProps {
  album: ArtistRelease;
  onClick: (album: ArtistRelease) => void;
  onDownload: (e: React.MouseEvent, url: string) => void;
}

export const SearchAlbumCard: FC<SearchAlbumCardProps> = ({ album, onClick, onDownload }) => (
  <div
    onClick={() => onClick(album)}
    className="group flex cursor-pointer flex-col gap-2 rounded-lg p-3 transition-colors hover:bg-white/5"
  >
    <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-zinc-800 shadow-lg">
      <Image src={album.coverUrl ?? undefined} alt={album.albumName} fallbackIcon="music" />
      {album.spotifyUrl && (
        <button
          onClick={(e) => onDownload(e, album.spotifyUrl!)}
          className="absolute right-2 bottom-2 flex h-9 w-9 items-center justify-center rounded-full bg-green-500 opacity-0 shadow-lg transition-all duration-200 group-hover:opacity-100 hover:scale-110 hover:bg-green-400"
          title="Download"
        >
          <svg className="h-4 w-4 text-black" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}
    </div>
    <div>
      <p className="truncate text-sm font-semibold text-white">{album.albumName}</p>
      <p className="truncate text-xs text-zinc-400">
        {album.releaseDate?.slice(0, 4)}
        {album.releaseDate && album.artistName ? " · " : ""}
        {album.artistName}
      </p>
    </div>
  </div>
);
