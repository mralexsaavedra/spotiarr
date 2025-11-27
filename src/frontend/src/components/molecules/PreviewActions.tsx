import { FC } from "react";
import { Button } from "../atoms/Button";

interface PreviewActionsProps {
  isDownloading: boolean;
  onDownload: () => void;
  onGoBack: () => void;
}

export const PreviewActions: FC<PreviewActionsProps> = ({
  isDownloading,
  onDownload,
  onGoBack,
}) => {
  return (
    <>
      <Button
        variant="primary"
        size="lg"
        icon="fa-download"
        loading={isDownloading}
        onClick={onDownload}
      >
        {isDownloading ? "Downloading..." : "Download"}
      </Button>

      <Button variant="secondary" size="md" icon="fa-arrow-left" onClick={onGoBack}>
        Back
      </Button>
    </>
  );
};
