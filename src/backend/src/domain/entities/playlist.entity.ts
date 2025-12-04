import {
  PlaylistStatusEnum,
  PlaylistTypeEnum,
  TrackStatusEnum,
  type IPlaylist,
} from "@spotiarr/shared";

export class Playlist {
  constructor(private readonly props: IPlaylist) {}

  get id() {
    return this.props.id;
  }
  get name() {
    return this.props.name;
  }
  get type() {
    return this.props.type;
  }
  get spotifyUrl() {
    return this.props.spotifyUrl;
  }
  get error() {
    return this.props.error;
  }
  get subscribed() {
    return this.props.subscribed;
  }
  get coverUrl() {
    return this.props.coverUrl;
  }
  get artistImageUrl() {
    return this.props.artistImageUrl;
  }
  get tracks() {
    return this.props.tracks;
  }
  get createdAt() {
    return this.props.createdAt;
  }

  updateDetails(name: string, type: PlaylistTypeEnum, coverUrl?: string, artistImageUrl?: string) {
    this.props.name = name;
    this.props.type = type;
    this.props.coverUrl = coverUrl;
    this.props.artistImageUrl = artistImageUrl;
    this.props.error = undefined;
  }

  markAsSubscribed() {
    this.props.subscribed = true;
  }

  markAsUnsubscribed() {
    this.props.subscribed = false;
  }

  markAsError(error: string) {
    this.props.error = error;
  }

  toPrimitive(): IPlaylist {
    return { ...this.props };
  }

  calculateStatus(): PlaylistStatusEnum {
    if (this.props.error) return PlaylistStatusEnum.Error;

    const tracks = this.props.tracks ?? [];
    const totalCount = tracks.length;
    const completedCount = tracks.filter((t) => t.status === TrackStatusEnum.Completed).length;
    const failedCount = tracks.filter((t) => t.status === TrackStatusEnum.Error).length;
    const hasTracks = totalCount > 0;

    if (hasTracks && completedCount === totalCount) {
      return PlaylistStatusEnum.Completed;
    }

    if (failedCount > 0) {
      return PlaylistStatusEnum.Warning;
    }

    if (this.props.subscribed) return PlaylistStatusEnum.Subscribed;

    return PlaylistStatusEnum.InProgress;
  }
}
