import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Loading } from "@/components/atoms/Loading";
import { PageHeader } from "@/components/molecules/PageHeader";
import { SearchInput } from "@/components/molecules/SearchInput";
import { SpotifyErrorState } from "@/components/molecules/SpotifyErrorState";
import { ArtistList } from "@/components/organisms/ArtistList";
import { useArtistsController } from "@/hooks/controllers/useArtistsController";

export const Artists: FC = () => {
  const { t } = useTranslation();
  const { filteredArtists, isLoading, error, search, handleSearchChange, handleArtistClick } =
    useArtistsController();

  if (error) {
    return (
      <section className="bg-background flex-1 px-4 py-6 md:px-8">
        <SpotifyErrorState error={error} message={t("artists.error")} />
      </section>
    );
  }

  return (
    <section className="bg-background flex-1 px-4 pb-6 md:px-8">
      <div className="bg-background/95 sticky top-[60px] z-30 -mx-4 mb-6 flex flex-col gap-3 border-b border-white/10 px-4 py-4 shadow-md backdrop-blur-md md:-mx-8 md:flex-row md:items-center md:justify-between md:px-8">
        <PageHeader title={t("artists.title")} />
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder={t("artists.filterPlaceholder")}
          className="w-full md:w-64"
        />
      </div>

      {isLoading ? (
        <Loading />
      ) : filteredArtists.length === 0 ? (
        <div className="text-text-secondary">{t("artists.empty")}</div>
      ) : (
        <ArtistList artists={filteredArtists} onClick={handleArtistClick} />
      )}
    </section>
  );
};
