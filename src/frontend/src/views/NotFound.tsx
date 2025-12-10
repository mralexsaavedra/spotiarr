import { FC, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { GenericErrorState } from "../components/errors/GenericErrorState";
import { Path } from "../routes/routes";

export const NotFound: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleGoHome = useCallback(() => {
    navigate(Path.HOME);
  }, [navigate]);

  return (
    <GenericErrorState
      title={t("common.errors.pageNotFound")}
      description={t("common.errors.pageNotFoundDesc")}
      onGoHome={handleGoHome}
      variant="embedded"
    />
  );
};
