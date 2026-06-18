import { faHeadphones } from "@fortawesome/free-solid-svg-icons";
import { TopArtistItem, TopTrackItem } from "@spotiarr/shared";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Loading } from "@/components/atoms/Loading";
import { EmptyState } from "@/components/molecules/EmptyState";

interface MostListenedSectionProps {
  topTracks: TopTrackItem[];
  topArtists: TopArtistItem[];
  isLoading: boolean;
}

export const MostListenedSection: FC<MostListenedSectionProps> = ({
  topTracks,
  topArtists,
  isLoading,
}) => {
  const { t } = useTranslation();

  const isEmpty = topTracks.length === 0 && topArtists.length === 0;

  return (
    <section>
      <h2 className="text-text-primary mb-4 text-lg font-semibold">
        {t("dashboard.mostListenedTitle")}
      </h2>

      {isLoading ? (
        <Loading className="min-h-[8rem]" />
      ) : isEmpty ? (
        <EmptyState icon={faHeadphones} title={t("dashboard.mostListenedEmpty")} />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {topTracks.length > 0 && (
            <div>
              <h3 className="text-text-secondary mb-3 text-sm font-semibold tracking-wide uppercase">
                {t("dashboard.topTracksTitle")}
              </h3>
              <ul className="space-y-2">
                {topTracks.map((track, index) => (
                  <li
                    key={`${track.trackUrl ?? track.trackName}-${index}`}
                    className="flex items-center gap-3"
                  >
                    <span className="text-text-secondary w-5 text-right text-sm font-medium">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-text-primary truncate text-sm font-medium">
                        {track.trackName}
                      </p>
                      <p className="text-text-secondary truncate text-xs">{track.artist}</p>
                    </div>
                    <span className="text-text-secondary shrink-0 text-xs">{track.playCount}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {topArtists.length > 0 && (
            <div>
              <h3 className="text-text-secondary mb-3 text-sm font-semibold tracking-wide uppercase">
                {t("dashboard.topArtistsTitle")}
              </h3>
              <ul className="space-y-2">
                {topArtists.map((artist, index) => (
                  <li key={`${artist.artist}-${index}`} className="flex items-center gap-3">
                    <span className="text-text-secondary w-5 text-right text-sm font-medium">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-text-primary truncate text-sm font-medium">
                        {artist.artist}
                      </p>
                    </div>
                    <span className="text-text-secondary shrink-0 text-xs">{artist.playCount}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
