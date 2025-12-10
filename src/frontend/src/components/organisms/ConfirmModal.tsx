import { FC } from "react";
import { Button } from "../atoms/Button";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export const ConfirmModal: FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isDestructive = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm duration-200">
      <div className="bg-background-hover animate-in zoom-in-95 w-full max-w-md scale-100 transform rounded-lg border border-white/5 p-6 shadow-2xl transition-all duration-200">
        <h2 className="mb-2 text-xl font-bold text-white">{title}</h2>
        <p className="text-text-subtle mb-6 text-sm">{description}</p>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel} className="text-white hover:text-white">
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? "primary" : "primary"}
            onClick={onConfirm}
            className={
              isDestructive
                ? "border-transparent bg-red-500 text-white hover:bg-red-600"
                : "bg-primary hover:bg-primary-light text-black"
            }
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
