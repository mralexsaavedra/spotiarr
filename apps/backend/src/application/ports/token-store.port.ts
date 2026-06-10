export interface TokenStorePort {
  getString(key: string, fallback?: string): Promise<string>;
  setString(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}
