import i18n from "../i18n";

export const formatRelativeDate = (timestamp: number, includeTime = true): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const currentLocale = i18n.language || "en";

  if (diffDays === 0) {
    if (!includeTime) return i18n.t("common.dates.today");
    const time = date.toLocaleTimeString(currentLocale, { hour: "2-digit", minute: "2-digit" });
    return i18n.t("common.dates.todayAt", { time });
  }

  if (diffDays === 1) {
    if (!includeTime) return i18n.t("common.dates.yesterday");
    const time = date.toLocaleTimeString(currentLocale, { hour: "2-digit", minute: "2-digit" });
    return i18n.t("common.dates.yesterdayAt", { time });
  }

  if (diffDays < 7) {
    return i18n.t("common.dates.daysAgo", { count: diffDays });
  }

  return date.toLocaleDateString(currentLocale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const formatDuration = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};
