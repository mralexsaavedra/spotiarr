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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-background-hover rounded-lg shadow-2xl max-w-md w-full p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200 border border-white/5">
        <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
        <p className="text-text-subtle text-sm mb-6">{description}</p>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel} className="text-white hover:text-white">
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? "primary" : "primary"}
            onClick={onConfirm}
            className={
              isDestructive
                ? "bg-red-500 hover:bg-red-600 text-white border-transparent"
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
