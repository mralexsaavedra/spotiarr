import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, useEffect, useState } from "react";
import { Toast as ToastType } from "../../contexts/ToastContext";

interface ToastProps {
  toast: ToastType;
  onRemove: (id: string) => void;
}

export const Toast: FC<ToastProps> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleRemove = () => {
    setIsVisible(false);
    setTimeout(() => {
      onRemove(toast.id);
    }, 300); // Wait for exit animation
  };

  const icons: Record<string, IconProp> = {
    success: "circle-check",
    error: "circle-exclamation",
    info: "circle-exclamation",
    warning: "triangle-exclamation",
  };

  const colors = {
    success: "bg-green-500/10 border-green-500/20 text-green-500",
    error: "bg-red-500/10 border-red-500/20 text-red-500",
    info: "bg-blue-500/10 border-blue-500/20 text-blue-500",
    warning: "bg-yellow-500/10 border-yellow-500/20 text-yellow-500",
  };

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-md transition-all duration-300 transform
        ${colors[toast.type]}
        ${isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}
      `}
      role="alert"
    >
      <FontAwesomeIcon icon={icons[toast.type]} className="text-lg" />
      <p className="text-sm font-medium">{toast.message}</p>
      <button
        onClick={handleRemove}
        className="ml-auto text-current opacity-70 hover:opacity-100 transition-opacity"
      >
        <FontAwesomeIcon icon="xmark" />
      </button>
    </div>
  );
};
