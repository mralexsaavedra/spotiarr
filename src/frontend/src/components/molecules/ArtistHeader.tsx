import { FC } from "react";

interface ArtistHeaderProps {
  name: string;
  image?: string | null;
  followersText?: string | null;
  spotifyUrl?: string | null;
}

export const ArtistHeader: FC<ArtistHeaderProps> = ({ name, image, followersText, spotifyUrl }) => {
  return (
    <header className="relative w-full h-[40vh] min-h-[340px] max-h-[500px]">
      {/* Background Image */}
      {image ? (
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${image})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-background" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-zinc-800">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        </div>
      )}

      {/* Content */}
      <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 z-10">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-6 drop-shadow-lg">
          {spotifyUrl ? (
            <a
              href={spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-green-500 transition-colors"
            >
              {name}
            </a>
          ) : (
            name
          )}
        </h1>

        {followersText && (
          <p className="text-base font-medium drop-shadow-md">{followersText} followers</p>
        )}
      </div>
    </header>
  );
};
