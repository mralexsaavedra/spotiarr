import { faCircleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../atoms/Button";

interface PlaylistNotFoundProps {
  onGoHome: () => void;
}

export const PlaylistNotFound: FC<PlaylistNotFoundProps> = ({ onGoHome }) => {
  const { t } = useTranslation();

  return (
    <section className="bg-background flex flex-1 items-center justify-center px-4 py-8 md:px-8">
      <div className="space-y-4 text-center">
        <FontAwesomeIcon icon={faCircleExclamation} className="text-text-secondary text-6xl" />
        <h2 className="text-text-primary text-2xl font-bold">{t("playlist.notFound")}</h2>
        <Button
          variant="primary"
          size="md"
          onClick={onGoHome}
          className="transition-transform hover:scale-105"
        >
          {t("playlist.goBack")}
        </Button>
      </div>
    </section>
  );
};
