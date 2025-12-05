import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, ImgHTMLAttributes, useState } from "react";
import { cn } from "../../utils/cn";

interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallbackIcon?: IconProp;
  fallbackClassName?: string;
  wrapperClassName?: string;
}

export const Image: FC<ImageProps> = ({
  src,
  alt,
  className,
  fallbackIcon = "music",
  fallbackClassName,
  wrapperClassName,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-white/5",
          className,
          fallbackClassName,
        )}
      >
        <FontAwesomeIcon icon={fallbackIcon} className="text-4xl opacity-50 text-text-secondary" />
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full overflow-hidden", wrapperClassName)}>
      {/* Loading Skeleton */}
      {!isLoaded && <div className="absolute inset-0 animate-pulse bg-white/10" />}

      <img
        src={src}
        alt={alt}
        className={cn(
          "h-full w-full object-cover transition-all duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          className,
        )}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        {...props}
      />
    </div>
  );
};
