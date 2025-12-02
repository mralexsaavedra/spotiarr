import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, ReactNode, useMemo } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconProp | string;
  loading?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
  title?: string;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-primary hover:bg-primary-light text-black",
  secondary: "bg-white/10 hover:bg-white/20 text-text-primary",
  danger: "bg-white/10 hover:bg-red-500/20 text-text-primary hover:text-red-400",
  ghost: "bg-transparent hover:bg-white/10 text-text-secondary hover:text-text-primary",
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

const BASE_STYLES = "rounded-full font-semibold transition-colors flex items-center gap-2";

export const Button: FC<ButtonProps> = ({
  children,
  onClick,
  disabled = false,
  variant = "secondary",
  size = "md",
  icon,
  loading = false,
  className = "",
  type = "button",
  title,
}) => {
  const isDisabled = useMemo(() => disabled || loading, [disabled, loading]);

  const finalClassName = useMemo(() => {
    const disabledStyles = isDisabled ? "opacity-50 cursor-not-allowed" : "";
    return `${BASE_STYLES} ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${disabledStyles} ${className}`;
  }, [variant, size, isDisabled, className]);

  const iconElement = useMemo(() => {
    if (loading) {
      return <FontAwesomeIcon icon="spinner" spin />;
    }
    if (icon) {
      let finalIcon = icon;
      if (typeof icon === "string" && icon.startsWith("fa-")) {
        finalIcon = icon.replace(/^fa-/, "") as IconProp;
      }
      // Handle space separated classes like "fa-brands fa-spotify"
      if (typeof icon === "string" && icon.includes(" ")) {
        const parts = icon.split(" ");
        const name = parts.find(
          (p) => p.startsWith("fa-") && p !== "fa-brands" && p !== "fa-solid" && p !== "fa-regular",
        );
        if (name) {
          finalIcon = name.replace(/^fa-/, "") as IconProp;
        }
      }

      return <FontAwesomeIcon icon={finalIcon as IconProp} />;
    }
    return null;
  }, [loading, icon]);

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={finalClassName}
      title={title}
    >
      {iconElement}
      {children}
    </button>
  );
};
