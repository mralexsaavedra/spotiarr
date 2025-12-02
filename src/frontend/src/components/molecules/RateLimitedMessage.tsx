import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";

export const RateLimitedMessage: FC = () => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md text-center space-y-4">
        <FontAwesomeIcon icon="hourglass-half" className="text-6xl text-text-secondary" />
        <h2 className="text-2xl font-bold text-text-primary">Rate Limited</h2>
        <p className="text-text-secondary">
          Spotify is temporarily limiting requests. Please try again in a few minutes.
        </p>
      </div>
    </div>
  );
};
