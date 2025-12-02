import { FC, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { GenericErrorState } from "../components/errors/GenericErrorState";
import { Path } from "../routes/routes";

export const NotFound: FC = () => {
  const navigate = useNavigate();

  const handleGoHome = useCallback(() => {
    navigate(Path.HOME);
  }, [navigate]);

  return (
    <GenericErrorState
      title="Page Not Found"
      description="The page you are looking for does not exist or has been moved."
      onGoHome={handleGoHome}
      variant="embedded"
    />
  );
};
