import { clsx } from "clsx";
import { FC, HTMLAttributes } from "react";

export const Skeleton: FC<HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  return <div className={clsx("animate-pulse rounded-md bg-white/10", className)} {...props} />;
};
