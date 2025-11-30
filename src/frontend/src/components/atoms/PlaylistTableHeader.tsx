import { FC } from "react";

export const PlaylistTableHeader: FC = () => {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[16px_1fr_1fr_180px] gap-4 px-4 py-2 border-b border-white/10 text-text-secondary text-sm uppercase tracking-wider mb-4 sticky top-0 bg-background z-10">
      <div className="text-center">#</div>
      <div>Title</div>
      <div className="hidden md:block">Album</div>
      <div className="text-right">
        <i className="fa-regular fa-clock" />
      </div>
    </div>
  );
};
