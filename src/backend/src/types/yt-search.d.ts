declare module "yt-search" {
  const search: (query: string) => Promise<{
    videos: {
      url: string;
      title: string;
      image: string;
      thumbnail: string;
      seconds: number;
      timestamp: string;
      duration: {
        seconds: number;
        timestamp: string;
      };
      views: number;
      ago: string;
      author: {
        name: string;
        url: string;
      };
    }[];
  }>;
  export = search;
}
