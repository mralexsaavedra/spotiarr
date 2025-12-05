import { FC } from "react";
import { useToast } from "../../contexts/ToastContext";
import { Toast } from "../molecules/Toast";

export const ToastContainer: FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      <div className="flex flex-col gap-2 pointer-events-auto">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </div>
  );
};
