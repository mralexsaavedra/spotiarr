import { useEffect } from "react";
import { usePlayerStore } from "@/store/usePlayerStore";

const IGNORED_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"]);

export function useGlobalPlayerShortcuts(): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const target = e.target as HTMLElement;
      if (IGNORED_TAGS.has(target.tagName) || target.isContentEditable) return;

      const { currentIndex, currentTime, volume, togglePlay, seek, setVolume, toggleMute } =
        usePlayerStore.getState();

      if (currentIndex === null) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          seek(currentTime - 5);
          break;
        case "ArrowRight":
          seek(currentTime + 5);
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume(volume + 0.05);
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume(volume - 0.05);
          break;
        case "m":
        case "M":
          toggleMute();
          break;
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
}
