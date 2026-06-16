import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";

export const TERMINAL_TRACK_ERROR_CODES = new Set(["youtube_not_found"]);

export class Track {
  constructor(private readonly props: ITrack) {}

  get id() {
    return this.props.id;
  }
  get name() {
    return this.props.name;
  }
  get artist() {
    return this.props.artist;
  }
  get status() {
    return this.props.status;
  }
  get playlistId() {
    return this.props.playlistId;
  }
  get youtubeUrl() {
    return this.props.youtubeUrl;
  }
  get spotifyUrl() {
    return this.props.spotifyUrl;
  }
  get trackUrl() {
    return this.props.trackUrl;
  }
  get searchAttempts(): number {
    return this.props.searchAttempts ?? 0;
  }

  isTerminalError(): boolean {
    return !!this.props.error && TERMINAL_TRACK_ERROR_CODES.has(this.props.error);
  }

  markAsDownloading() {
    if (this.props.status === TrackStatusEnum.Completed) {
      // Domain rules go here.
    }
    this.props.status = TrackStatusEnum.Downloading;
  }

  markAsCompleted() {
    this.props.status = TrackStatusEnum.Completed;
    this.props.completedAt = Date.now();
    this.props.error = undefined;
  }

  setDurationMs(durationMs: number) {
    this.props.durationMs = durationMs;
  }

  markAsError(error: string) {
    this.props.status = TrackStatusEnum.Error;
    this.props.error = error;
  }

  markAsQueued(youtubeUrl: string) {
    this.props.youtubeUrl = youtubeUrl;
    this.props.status = TrackStatusEnum.Queued;
    this.props.searchAttempts = 0;
  }

  markAsSearching() {
    this.props.status = TrackStatusEnum.Searching;
    this.props.searchAttempts = (this.props.searchAttempts ?? 0) + 1;
  }

  markAsNew() {
    this.props.status = TrackStatusEnum.New;
    this.props.error = undefined;
  }

  toPrimitive(): ITrack {
    return { ...this.props };
  }
}
