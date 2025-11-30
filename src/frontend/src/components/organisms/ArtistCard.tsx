import { FC, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Path } from "../../routes/routes";

interface ArtistCardProps {
  id: string;
  name: string;
  image: string | null;
  spotifyUrl: string | null;
}

export const ArtistCard: FC<ArtistCardProps> = ({ id, name, image }) => {
  const navigate = useNavigate();

  const handleCardClick = useCallback(() => {
    navigate(Path.ARTIST_DETAIL.replace(":id", id));
  }, [id, navigate]);

  return (
    <article
      key={id}
      className="group p-3 rounded-md hover:bg-white/10 transition-colors cursor-pointer flex flex-col gap-3"
      onClick={handleCardClick}
    >
      <div className="w-full aspect-square rounded-full overflow-hidden bg-zinc-800 shadow-lg relative">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <i className="fa-solid fa-user text-4xl text-zinc-600" />
          </div>
        )}
      </div>
      <div className="flex flex-col min-w-0">
        <h3 className="font-bold text-base text-white truncate">{name}</h3>
        <p className="text-sm text-zinc-400">Artist</p>
      </div>
    </article>
  );
};
