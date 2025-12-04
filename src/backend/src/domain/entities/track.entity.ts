import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";

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

  // Domain Logic / Behavior

  markAsDownloading() {
    if (this.props.status === TrackStatusEnum.Completed) {
      // Maybe we shouldn't download if already completed?
      // Domain rules go here.
    }
    this.props.status = TrackStatusEnum.Downloading;
  }

  markAsCompleted() {
    this.props.status = TrackStatusEnum.Completed;
    this.props.completedAt = Date.now();
    this.props.error = undefined;
  }

  markAsError(error: string) {
    this.props.status = TrackStatusEnum.Error;
    this.props.error = error;
  }

  markAsQueued(youtubeUrl: string) {
    this.props.youtubeUrl = youtubeUrl;
    this.props.status = TrackStatusEnum.Queued;
  }

  markAsSearching() {
    this.props.status = TrackStatusEnum.Searching;
  }

  markAsNew() {
    this.props.status = TrackStatusEnum.New;
    this.props.error = undefined;
  }

  toPrimitive(): ITrack {
    return { ...this.props };
  }
}
