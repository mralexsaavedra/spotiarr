import { faMusic } from "@fortawesome/free-solid-svg-icons";
import { FC } from "react";
import { Loading } from "@/components/atoms/Loading";
import { EmptyState } from "@/components/molecules/EmptyState";
import { LibraryArtistProfile } from "@/components/organisms/LibraryArtistProfile";
import { useLibraryArtistController } from "@/hooks/controllers/useLibraryArtistController";

export const LibraryArtist: FC = () => {
  const { t, artist, isLoading, error } = useLibraryArtistController();

  if (isLoading) {
    return <Loading />;
  }

  if (error || !artist) {
    return (
      <div className="bg-background flex flex-1 items-center justify-center p-6 text-white">
        <EmptyState
          icon={faMusic}
          title={t("library.artistNotFound", "Artist not found")}
          description={t("library.artistNotFoundDescription", "Could not load artist details.")}
        />
      </div>
    );
  }

  return <LibraryArtistProfile artist={artist} />;
};
