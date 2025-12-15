import { faHourglassHalf } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";

export const RateLimitedMessage: FC = () => {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md space-y-4 text-center">
        <FontAwesomeIcon icon={faHourglassHalf} className="text-text-secondary text-6xl" />
        <h2 className="text-text-primary text-2xl font-bold">Rate Limited</h2>
        <p className="text-text-secondary">
          Spotify is temporarily limiting requests. Please try again in a few minutes.
        </p>
      </div>
    </div>
  );
};
