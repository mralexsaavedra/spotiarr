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
    <section className="flex-1 bg-background px-4 md:px-8 py-6 flex flex-col items-center justify-center min-h-[60vh]">
      <div className="max-w-md text-center space-y-4">
        <FontAwesomeIcon icon={faCircleExclamation} className="text-6xl text-text-secondary" />
        <h2 className="text-2xl font-bold text-text-primary">Preview not available</h2>
        <p className="text-text-secondary">{error ? String(error) : "Could not load preview"}</p>
        <Button variant="primary" size="md" onClick={onGoBack}>
          Go back
        </Button>
      </div>
    </section>
  );
};
