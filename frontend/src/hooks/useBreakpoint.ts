import { useState, useEffect } from 'react';

const MOBILE = 768;
const TABLET = 1024;

interface Breakpoint {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
}

export function useBreakpoint(): Breakpoint {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return {
    isMobile: width < MOBILE,
    isTablet: width >= MOBILE && width <= TABLET,
    isDesktop: width > TABLET,
    width,
  };
}
