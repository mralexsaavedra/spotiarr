export const formatRelativeDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Today at ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
  }

  if (diffDays === 1) {
    return `Yesterday at ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
  }

  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
};

export const formatDuration = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};
