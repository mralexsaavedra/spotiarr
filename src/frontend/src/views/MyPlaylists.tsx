import { ApiErrorCode } from "@spotiarr/shared";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Loading } from "../components/atoms/Loading";
import { PageHeader } from "../components/molecules/PageHeader";
import { SearchInput } from "../components/molecules/SearchInput";
import { SpotifyErrorState } from "../components/molecules/SpotifyErrorState";
import { SpotifyPlaylistList } from "../components/organisms/SpotifyPlaylistList";
import { useMyPlaylistsController } from "../hooks/controllers/useMyPlaylistsController";
import { ApiError } from "../services/httpClient";

export const MyPlaylists: FC = () => {
  const { t } = useTranslation();
  const { filteredPlaylists, isLoading, error, search, handleSearchChange, handlePlaylistClick } =
    useMyPlaylistsController();

  if (error) {
    const apiError = error instanceof ApiError ? error : null;
    const errorCode = (apiError?.code || "unknown_error") as ApiErrorCode;

    return (
      <section className="bg-background flex-1 px-4 py-6 md:px-8">
        <SpotifyErrorState error={errorCode} message={t("myPlaylists.error")} />
      </section>
    );
  }

  return (
    <section className="bg-background flex-1 px-4 pb-6 md:px-8">
      <div className="bg-background/95 sticky top-[60px] z-30 -mx-4 mb-6 flex flex-col gap-3 border-b border-white/10 px-4 py-4 shadow-md backdrop-blur-md md:-mx-8 md:flex-row md:items-center md:justify-between md:px-8">
        <PageHeader title={t("myPlaylists.title")} />
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder={t("myPlaylists.filterPlaceholder")}
          className="w-full md:w-64"
        />
      </div>

      {isLoading ? (
        <Loading />
      ) : filteredPlaylists.length === 0 ? (
        <div className="text-text-secondary">{t("myPlaylists.empty")}</div>
      ) : (
        <SpotifyPlaylistList playlists={filteredPlaylists} onClick={handlePlaylistClick} />
      )}
    </section>
  );
};
