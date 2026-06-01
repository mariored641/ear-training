import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const HOME_ROUTE = '/';

/**
 * Visual layer for the Workshop theme:
 *  - `body.workshop-active` (every route): wood/brass token palette + solid dark wood bg.
 *  - `body.home-wood-bg` (homepage only): photographic walnut desk JPG + SVG grain overlay.
 */
export default function GrainOverlay() {
  const { pathname } = useLocation();
  const home = pathname === HOME_ROUTE;

  useEffect(() => {
    document.body.classList.add('workshop-active');
    document.body.classList.toggle('home-wood-bg', home);
    return () => {
      document.body.classList.remove('workshop-active');
      document.body.classList.remove('home-wood-bg');
    };
  }, [home]);

  if (!home) return null;

  return (
    <svg
      className="grain-overlay"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
    >
      <filter id="workshopGrain">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.9"
          numOctaves="2"
          stitchTiles="stitch"
        />
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 0.15
                  0 0 0 0 0.08
                  0 0 0 0 0.04
                  0 0 0 0.6 0"
        />
      </filter>
      <rect width="100%" height="100%" filter="url(#workshopGrain)" />
    </svg>
  );
}
