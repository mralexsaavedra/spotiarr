import { FC } from "react";

export const EmptyReleases: FC = () => {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center space-y-4 max-w-md">
        <i className="fa-solid fa-compact-disc text-6xl text-text-secondary" />
        <h2 className="text-2xl font-bold text-text-primary">No new releases</h2>
        <p className="text-text-secondary">No recent releases found from your followed artists.</p>
      </div>
    </div>
  );
};
