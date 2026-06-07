import { useEffect, useRef } from "react";

export function useFocusReturnOnClose(
  isOpen: boolean,
  triggerRef: React.RefObject<HTMLElement | null>,
): void {
  const wasOpenRef = useRef(isOpen);

  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      triggerRef.current?.focus();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, triggerRef]);
}
