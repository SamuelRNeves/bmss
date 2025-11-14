import { useEffect, useState } from "react";

const DEFAULT_BREAKPOINT = 768;

const getMatches = (maxWidth: number) => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia(`(max-width: ${maxWidth}px)`).matches;
};

export function useBreakpoint(maxWidth: number = DEFAULT_BREAKPOINT) {
  const [isMatching, setIsMatching] = useState(() => getMatches(maxWidth));

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMatching(event.matches);
    };

    setIsMatching(mediaQuery.matches);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [maxWidth]);

  return isMatching;
}

export function useIsMobile() {
  return useBreakpoint();
}
