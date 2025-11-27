import { FC } from "react";

export const EmptyHistory: FC = () => {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center space-y-4 max-w-md">
        <i className="fa-solid fa-clock-rotate-left text-6xl text-text-secondary" />
        <h2 className="text-2xl font-bold text-text-primary">No download history yet</h2>
        <p className="text-text-secondary">Completed downloads will appear here.</p>
      </div>
    </div>
  );
};
