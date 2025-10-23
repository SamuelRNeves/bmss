export {};

declare global {
  interface WindowEventMap {
    "news-updated": CustomEvent<unknown>;
    "sentiments-updated": CustomEvent<unknown>;
  }
}
