import { FC } from "react";
import { useToast } from "../../contexts/ToastContext";
import { Toast } from "../molecules/Toast";

export const ToastContainer: FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="pointer-events-none fixed right-4 bottom-20 z-[100] flex w-full max-w-sm flex-col gap-2 md:bottom-6">
      <div className="pointer-events-auto flex flex-col gap-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </div>
  );
};
