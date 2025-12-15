import { faCircleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";
import { Button } from "../atoms/Button";

interface PreviewErrorProps {
  error?: unknown;
  onGoBack: () => void;
}

export const PreviewError: FC<PreviewErrorProps> = ({ error, onGoBack }) => {
  return (
    <section className="bg-background flex min-h-[60vh] flex-1 flex-col items-center justify-center px-4 py-6 md:px-8">
      <div className="max-w-md space-y-4 text-center">
        <FontAwesomeIcon icon={faCircleExclamation} className="text-text-secondary text-6xl" />
        <h2 className="text-text-primary text-2xl font-bold">Preview not available</h2>
        <p className="text-text-secondary">{error ? String(error) : "Could not load preview"}</p>
        <Button variant="primary" size="md" onClick={onGoBack}>
          Go back
        </Button>
      </div>
    </section>
  );
};
