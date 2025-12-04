/**
 * Application-wide configuration constants
 */
export const APP_CONFIG = {
  /**
   * Pagination settings
   */
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 12,
    ARTIST_ALBUMS_LIMIT: 50,
    ARTIST_ALBUMS_OFFSET_INCREMENT: 50,
  },

  /**
   * Cache settings
   */
  CACHE: {
    DEFAULT_MINUTES: 5,
    RELEASES_CACHE_KEY: "RELEASES_CACHE_MINUTES",
  },

  /**
   * Grid responsive breakpoints and column counts
   */
  GRID: {
    BREAKPOINTS: {
      ULTRAWIDE: 2560,
      LARGE: 1920,
      XL: 1280,
      LG: 1024,
      MD: 768,
      SM: 640,
    },
    COLUMNS: {
      ULTRAWIDE: 8,
      LARGE: 6,
      XL: 5,
      LG: 4,
      MD: 3,
      SM: 2,
      MOBILE: 2,
    },
  },

  /**
   * Debounce delays in milliseconds
   */
  DEBOUNCE: {
    DEFAULT_DELAY: 300,
    SEARCH_DELAY: 500,
  },

  /**
   * React Query configuration
   */
  QUERY: {
    STALE_TIME: 1000 * 60 * 5, // 5 minutes
    GC_TIME: 1000 * 60 * 10, // 10 minutes
    RETRY_COUNT: 1,
  },
} as const;
