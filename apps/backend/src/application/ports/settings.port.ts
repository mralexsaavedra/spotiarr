export interface SettingsPort {
  getString(key: string, fallback?: string): Promise<string>;
  getNumber(key: string, fallback?: number): Promise<number>;
}
