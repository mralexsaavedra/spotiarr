export function formatLibrarySize(bytes: number | null | undefined): string {
  const value = bytes ?? 0;
  const mb = value / 1024 / 1024;
  return mb > 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(2)} MB`;
}
