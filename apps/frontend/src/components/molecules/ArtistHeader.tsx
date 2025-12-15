import { FC } from "react";
import { useTranslation } from "react-i18next";

interface ArtistHeaderProps {
  name: string;
  image?: string | null;
  followersText?: string | null;
  spotifyUrl?: string | null;
}

export const ArtistHeader: FC<ArtistHeaderProps> = ({ name, image, followersText, spotifyUrl }) => {
  const { t } = useTranslation();

  return (
    <header className="relative h-[40vh] max-h-[500px] min-h-[340px] w-full">
      {/* Background Image */}
      {image ? (
        <div
          className="absolute inset-0 h-full w-full bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${image})` }}
        >
          <div className="to-background absolute inset-0 bg-gradient-to-b from-transparent via-black/20" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-zinc-800">
          <div className="to-background absolute inset-0 bg-gradient-to-b from-transparent" />
        </div>
      )}

      {/* Content */}
      <div className="absolute bottom-0 left-0 z-10 w-full p-6 md:p-8">
        <h1 className="mb-6 text-5xl font-black tracking-tighter drop-shadow-lg md:text-7xl lg:text-8xl">
          {spotifyUrl ? (
            <a
              href={spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-green-500"
            >
              {name}
            </a>
          ) : (
            name
          )}
        </h1>

        {followersText && (
          <p className="text-base font-medium drop-shadow-md">
            {followersText} {t("artist.followers")}
          </p>
        )}
      </div>
    </header>
  );
};
