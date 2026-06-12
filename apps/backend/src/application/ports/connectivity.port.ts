export interface ConnectivityPort {
  pingDatabase(): Promise<void>;
  pingRedis(): Promise<void>;
}
