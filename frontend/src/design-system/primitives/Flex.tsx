/**
 * Flex Primitive
 * Flexbox container with convenient alignment props
 */

import { forwardRef, type HTMLAttributes } from 'react';
import { spacing, type SpacingKey } from '../tokens/spacing';
import { borderRadius, type BorderRadiusKey } from '../tokens/borders';

/**
 * Flex-specific props
 */
export interface FlexProps extends HTMLAttributes<HTMLDivElement> {
  /** Flex direction */
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';

  /** Align items */
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';

  /** Justify content */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

  /** Flex wrap */
  wrap?: boolean | 'wrap' | 'nowrap' | 'wrap-reverse';

  /** Gap between items */
  gap?: SpacingKey;

  /** Row gap */
  rowGap?: SpacingKey;

  /** Column gap */
  columnGap?: SpacingKey;

  /** Use inline-flex instead of flex */
  inline?: boolean;

  /** Padding */
  p?: SpacingKey;
  px?: SpacingKey;
  py?: SpacingKey;

  /** Background color */
  bg?: string;

  /** Border radius */
  rounded?: BorderRadiusKey;
}

/**
 * Map align prop to CSS align-items value
 */
function getAlignItems(align: FlexProps['align']): string | undefined {
  if (!align) return undefined;
  const map: Record<NonNullable<FlexProps['align']>, string> = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    stretch: 'stretch',
    baseline: 'baseline',
  };
  return map[align];
}

/**
 * Map justify prop to CSS justify-content value
 */
function getJustifyContent(justify: FlexProps['justify']): string | undefined {
  if (!justify) return undefined;
  const map: Record<NonNullable<FlexProps['justify']>, string> = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    between: 'space-between',
    around: 'space-around',
    evenly: 'space-evenly',
  };
  return map[justify];
}

/**
 * Map wrap prop to CSS flex-wrap value
 */
function getFlexWrap(wrap: FlexProps['wrap']): 'wrap' | 'nowrap' | 'wrap-reverse' | undefined {
  if (wrap === undefined) return undefined;
  if (typeof wrap === 'boolean') return wrap ? 'wrap' : 'nowrap';
  return wrap;
}

/**
 * Flex Component
 */
export const Flex = forwardRef<HTMLDivElement, FlexProps>(
  (
    {
      direction,
      align,
      justify,
      wrap,
      gap,
      rowGap,
      columnGap,
      inline,
      p,
      px,
      py,
      bg,
      rounded,
      style,
      children,
      ...rest
    },
    ref
  ) => {
    const flexStyles: React.CSSProperties = {
      display: inline ? 'inline-flex' : 'flex',
      ...(direction && { flexDirection: direction }),
      ...(align && { alignItems: getAlignItems(align) }),
      ...(justify && { justifyContent: getJustifyContent(justify) }),
      ...(wrap !== undefined && { flexWrap: getFlexWrap(wrap) }),
      ...(gap !== undefined && { gap: spacing[gap] }),
      ...(rowGap !== undefined && { rowGap: spacing[rowGap] }),
      ...(columnGap !== undefined && { columnGap: spacing[columnGap] }),
      ...(p !== undefined && { padding: spacing[p] }),
      ...(px !== undefined && { paddingLeft: spacing[px], paddingRight: spacing[px] }),
      ...(py !== undefined && { paddingTop: spacing[py], paddingBottom: spacing[py] }),
      ...(bg && { backgroundColor: bg }),
      ...(rounded && { borderRadius: borderRadius[rounded] }),
      ...style,
    };

    return (
      <div ref={ref} style={flexStyles} {...rest}>
        {children}
      </div>
    );
  }
);

Flex.displayName = 'Flex';
