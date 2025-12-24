/**
 * Shared Icon Types
 */

import type { SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement>;

export const defaultIconProps: IconProps = {
  fill: 'none',
  viewBox: '0 0 24 24',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  strokeWidth: 2,
};
