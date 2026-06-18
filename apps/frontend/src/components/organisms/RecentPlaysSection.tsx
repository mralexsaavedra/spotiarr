import { faClockRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { RecentPlayItem } from "@spotiarr/shared";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Loading } from "@/components/atoms/Loading";
import { EmptyState } from "@/components/molecules/EmptyState";
import { formatRelativeDate } from "@/utils/date";

interface RecentPlaysSectionProps {
  recentPlays: RecentPlayItem[];
  isLoading: boolean;
}

export const RecentPlaysSection: FC<RecentPlaysSectionProps> = ({ recentPlays, isLoading }) => {
  const { t } = useTranslation();

  return (
    <section>
      <h2 className="text-text-primary mb-4 text-lg font-semibold">
        {t("dashboard.recentPlaysTitle")}
      </h2>

      {isLoading ? (
        <Loading className="min-h-[8rem]" />
      ) : recentPlays.length === 0 ? (
        <EmptyState icon={faClockRotateLeft} title={t("dashboard.recentPlaysEmpty")} />
      ) : (
        <ul className="space-y-2">
          {recentPlays.map((play, index) => (
            <li
              key={`${play.trackUrl ?? play.trackName}-${play.playedAt}-${index}`}
              className="flex items-center gap-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-text-primary truncate text-sm font-medium">{play.trackName}</p>
                <p className="text-text-secondary truncate text-xs">{play.artist}</p>
              </div>
              <span
                data-testid="recent-play-timestamp"
                className="text-text-secondary shrink-0 text-xs"
              >
                {formatRelativeDate(play.playedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
