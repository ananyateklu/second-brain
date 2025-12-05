/**
 * Box Primitive
 * Base layout component with style props for spacing, colors, and borders
 */

import { forwardRef, type HTMLAttributes } from 'react';
import { spacing, type SpacingKey } from '../tokens/spacing';
import { borderRadius, type BorderRadiusKey } from '../tokens/borders';

/**
 * Box style props
 */
export interface BoxStyleProps {
  /** Padding */
  p?: SpacingKey;
  px?: SpacingKey;
  py?: SpacingKey;
  pt?: SpacingKey;
  pr?: SpacingKey;
  pb?: SpacingKey;
  pl?: SpacingKey;

  /** Margin */
  m?: SpacingKey;
  mx?: SpacingKey;
  my?: SpacingKey;
  mt?: SpacingKey;
  mr?: SpacingKey;
  mb?: SpacingKey;
  ml?: SpacingKey;

  /** Width/Height */
  w?: string | number;
  h?: string | number;
  minW?: string | number;
  maxW?: string | number;
  minH?: string | number;
  maxH?: string | number;

  /** Background */
  bg?: string;

  /** Border */
  rounded?: BorderRadiusKey;
  border?: string;
  borderColor?: string;

  /** Display */
  display?: 'block' | 'inline-block' | 'inline' | 'flex' | 'inline-flex' | 'grid' | 'inline-grid' | 'none';

  /** Position */
  position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
  inset?: string | number;
  top?: string | number;
  right?: string | number;
  bottom?: string | number;
  left?: string | number;
  zIndex?: number | string;

  /** Overflow */
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
  overflowX?: 'visible' | 'hidden' | 'scroll' | 'auto';
  overflowY?: 'visible' | 'hidden' | 'scroll' | 'auto';

  /** Shadows */
  shadow?: string;

  /** Opacity */
  opacity?: number;
}

export interface BoxProps extends BoxStyleProps, Omit<HTMLAttributes<HTMLDivElement>, keyof BoxStyleProps> {}

/**
 * Convert size value to CSS
 */
function getSizeValue(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return `${value}px`;
  return value;
}

/**
 * Build style object from Box props
 */
function buildBoxStyles(props: BoxStyleProps): React.CSSProperties {
  const styles: React.CSSProperties = {};

  // Padding
  if (props.p !== undefined) styles.padding = spacing[props.p];
  if (props.px !== undefined) {
    styles.paddingLeft = spacing[props.px];
    styles.paddingRight = spacing[props.px];
  }
  if (props.py !== undefined) {
    styles.paddingTop = spacing[props.py];
    styles.paddingBottom = spacing[props.py];
  }
  if (props.pt !== undefined) styles.paddingTop = spacing[props.pt];
  if (props.pr !== undefined) styles.paddingRight = spacing[props.pr];
  if (props.pb !== undefined) styles.paddingBottom = spacing[props.pb];
  if (props.pl !== undefined) styles.paddingLeft = spacing[props.pl];

  // Margin
  if (props.m !== undefined) styles.margin = spacing[props.m];
  if (props.mx !== undefined) {
    styles.marginLeft = spacing[props.mx];
    styles.marginRight = spacing[props.mx];
  }
  if (props.my !== undefined) {
    styles.marginTop = spacing[props.my];
    styles.marginBottom = spacing[props.my];
  }
  if (props.mt !== undefined) styles.marginTop = spacing[props.mt];
  if (props.mr !== undefined) styles.marginRight = spacing[props.mr];
  if (props.mb !== undefined) styles.marginBottom = spacing[props.mb];
  if (props.ml !== undefined) styles.marginLeft = spacing[props.ml];

  // Dimensions
  if (props.w !== undefined) styles.width = getSizeValue(props.w);
  if (props.h !== undefined) styles.height = getSizeValue(props.h);
  if (props.minW !== undefined) styles.minWidth = getSizeValue(props.minW);
  if (props.maxW !== undefined) styles.maxWidth = getSizeValue(props.maxW);
  if (props.minH !== undefined) styles.minHeight = getSizeValue(props.minH);
  if (props.maxH !== undefined) styles.maxHeight = getSizeValue(props.maxH);

  // Background
  if (props.bg !== undefined) styles.backgroundColor = props.bg;

  // Border
  if (props.rounded !== undefined) styles.borderRadius = borderRadius[props.rounded];
  if (props.border !== undefined) styles.border = props.border;
  if (props.borderColor !== undefined) styles.borderColor = props.borderColor;

  // Display
  if (props.display !== undefined) styles.display = props.display;

  // Position
  if (props.position !== undefined) styles.position = props.position;
  if (props.inset !== undefined) styles.inset = getSizeValue(props.inset);
  if (props.top !== undefined) styles.top = getSizeValue(props.top);
  if (props.right !== undefined) styles.right = getSizeValue(props.right);
  if (props.bottom !== undefined) styles.bottom = getSizeValue(props.bottom);
  if (props.left !== undefined) styles.left = getSizeValue(props.left);
  if (props.zIndex !== undefined) styles.zIndex = props.zIndex;

  // Overflow
  if (props.overflow !== undefined) styles.overflow = props.overflow;
  if (props.overflowX !== undefined) styles.overflowX = props.overflowX;
  if (props.overflowY !== undefined) styles.overflowY = props.overflowY;

  // Shadow
  if (props.shadow !== undefined) styles.boxShadow = props.shadow;

  // Opacity
  if (props.opacity !== undefined) styles.opacity = props.opacity;

  return styles;
}

/**
 * Style prop keys to extract from props
 */
const stylePropKeys: (keyof BoxStyleProps)[] = [
  'p', 'px', 'py', 'pt', 'pr', 'pb', 'pl',
  'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml',
  'w', 'h', 'minW', 'maxW', 'minH', 'maxH',
  'bg', 'rounded', 'border', 'borderColor',
  'display', 'position', 'inset', 'top', 'right', 'bottom', 'left', 'zIndex',
  'overflow', 'overflowX', 'overflowY', 'shadow', 'opacity',
];

function extractStyleProps(props: BoxProps): { styleProps: BoxStyleProps; rest: Omit<BoxProps, keyof BoxStyleProps> } {
  const styleProps: BoxStyleProps = {};
  const rest: Record<string, unknown> = {};

  for (const key of Object.keys(props)) {
    if (stylePropKeys.includes(key as keyof BoxStyleProps)) {
      (styleProps as Record<string, unknown>)[key] = (props as Record<string, unknown>)[key];
    } else {
      rest[key] = (props as Record<string, unknown>)[key];
    }
  }

  return { styleProps, rest: rest as Omit<BoxProps, keyof BoxStyleProps> };
}

/**
 * Box Component
 */
export const Box = forwardRef<HTMLDivElement, BoxProps>(
  (props, ref) => {
    const { styleProps, rest } = extractStyleProps(props);
    const { style, children, ...elementProps } = rest;

    const boxStyles = buildBoxStyles(styleProps);
    const combinedStyles = { ...boxStyles, ...style };

    return (
      <div ref={ref} style={combinedStyles} {...elementProps}>
        {children}
      </div>
    );
  }
);

Box.displayName = 'Box';
