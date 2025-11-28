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
      className="group bg-background-elevated hover:bg-background-hover rounded-md p-4 transition-all cursor-pointer flex flex-col items-center text-center"
      onClick={handleCardClick}
    >
      <div className="relative w-24 h-24 mb-3 rounded-full overflow-hidden bg-background-hover shadow-lg">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <i className="fa-solid fa-user text-3xl text-text-secondary" />
          </div>
        )}
      </div>
      <h3 className="font-semibold text-sm text-text-primary truncate w-full">{name}</h3>
    </article>
  );
};
