export interface AiTrackSuggestion {
  title: string;
  artist: string;
}

export interface AiChatPort {
  generateTracks(prompt: string): Promise<AiTrackSuggestion[]>;
}
