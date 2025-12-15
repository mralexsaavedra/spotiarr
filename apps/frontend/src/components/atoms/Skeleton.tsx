import { FC, HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export const Skeleton: FC<HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  return <div className={cn("animate-pulse rounded-md bg-white/10", className)} {...props} />;
};
