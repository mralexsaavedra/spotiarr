export interface ConnectivityPort {
  pingDatabase(): Promise<void>;
}
