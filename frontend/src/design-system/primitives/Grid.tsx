/**
 * Grid Primitive
 * CSS Grid container with convenient grid-specific props
 */

import { forwardRef, type HTMLAttributes } from 'react';
import { spacing, type SpacingKey } from '../tokens/spacing';
import { borderRadius, type BorderRadiusKey } from '../tokens/borders';

/**
 * Grid-specific props
 */
export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of columns or explicit grid-template-columns value */
  columns?: number | string;

  /** Number of rows or explicit grid-template-rows value */
  rows?: number | string;

  /** Gap between grid items */
  gap?: SpacingKey;

  /** Row gap */
  rowGap?: SpacingKey;

  /** Column gap */
  columnGap?: SpacingKey;

  /** Auto-flow direction */
  autoFlow?: 'row' | 'column' | 'dense' | 'row dense' | 'column dense';

  /** Auto-generated column size */
  autoColumns?: string;

  /** Auto-generated row size */
  autoRows?: string;

  /** Template areas */
  areas?: string;

  /** Align items */
  alignItems?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';

  /** Justify items */
  justifyItems?: 'start' | 'center' | 'end' | 'stretch';

  /** Align content */
  alignContent?: 'start' | 'center' | 'end' | 'stretch' | 'between' | 'around' | 'evenly';

  /** Justify content */
  justifyContent?: 'start' | 'center' | 'end' | 'stretch' | 'between' | 'around' | 'evenly';

  /** Use inline-grid instead of grid */
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
 * Map alignment values to CSS
 */
function mapAlignment(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const map: Record<string, string> = {
    start: 'start',
    center: 'center',
    end: 'end',
    stretch: 'stretch',
    baseline: 'baseline',
    between: 'space-between',
    around: 'space-around',
    evenly: 'space-evenly',
  };
  return map[value] || value;
}

/**
 * Build grid template value from number or string
 */
function getGridTemplate(value: number | string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return `repeat(${value}, minmax(0, 1fr))`;
  return value;
}

/**
 * Grid Component
 */
export const Grid = forwardRef<HTMLDivElement, GridProps>(
  (
    {
      columns,
      rows,
      gap,
      rowGap,
      columnGap,
      autoFlow,
      autoColumns,
      autoRows,
      areas,
      alignItems,
      justifyItems,
      alignContent,
      justifyContent,
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
    const gridStyles: React.CSSProperties = {
      display: inline ? 'inline-grid' : 'grid',
      ...(columns !== undefined && { gridTemplateColumns: getGridTemplate(columns) }),
      ...(rows !== undefined && { gridTemplateRows: getGridTemplate(rows) }),
      ...(gap !== undefined && { gap: spacing[gap] }),
      ...(rowGap !== undefined && { rowGap: spacing[rowGap] }),
      ...(columnGap !== undefined && { columnGap: spacing[columnGap] }),
      ...(autoFlow && { gridAutoFlow: autoFlow }),
      ...(autoColumns && { gridAutoColumns: autoColumns }),
      ...(autoRows && { gridAutoRows: autoRows }),
      ...(areas && { gridTemplateAreas: areas }),
      ...(alignItems && { alignItems: mapAlignment(alignItems) }),
      ...(justifyItems && { justifyItems: mapAlignment(justifyItems) as React.CSSProperties['justifyItems'] }),
      ...(alignContent && { alignContent: mapAlignment(alignContent) }),
      ...(justifyContent && { justifyContent: mapAlignment(justifyContent) }),
      ...(p !== undefined && { padding: spacing[p] }),
      ...(px !== undefined && { paddingLeft: spacing[px], paddingRight: spacing[px] }),
      ...(py !== undefined && { paddingTop: spacing[py], paddingBottom: spacing[py] }),
      ...(bg && { backgroundColor: bg }),
      ...(rounded && { borderRadius: borderRadius[rounded] }),
      ...style,
    };

    return (
      <div ref={ref} style={gridStyles} {...rest}>
        {children}
      </div>
    );
  }
);

Grid.displayName = 'Grid';

/**
 * Grid Item Component
 * For controlling placement of items within the grid
 */
export interface GridItemProps extends HTMLAttributes<HTMLDivElement> {
  /** Grid column span or explicit grid-column value */
  colSpan?: number | string;

  /** Grid row span or explicit grid-row value */
  rowSpan?: number | string;

  /** Grid column start */
  colStart?: number | string;

  /** Grid column end */
  colEnd?: number | string;

  /** Grid row start */
  rowStart?: number | string;

  /** Grid row end */
  rowEnd?: number | string;

  /** Grid area name */
  area?: string;

  /** Align self */
  alignSelf?: 'start' | 'center' | 'end' | 'stretch';

  /** Justify self */
  justifySelf?: 'start' | 'center' | 'end' | 'stretch';
}

function getSpanValue(span: number | string | undefined): string | undefined {
  if (span === undefined) return undefined;
  if (typeof span === 'number') return `span ${span}`;
  return span;
}

export const GridItem = forwardRef<HTMLDivElement, GridItemProps>(
  (
    {
      colSpan,
      rowSpan,
      colStart,
      colEnd,
      rowStart,
      rowEnd,
      area,
      alignSelf,
      justifySelf,
      style,
      children,
      ...rest
    },
    ref
  ) => {
    const gridItemStyles: React.CSSProperties = {
      ...(colSpan !== undefined && { gridColumn: getSpanValue(colSpan) }),
      ...(rowSpan !== undefined && { gridRow: getSpanValue(rowSpan) }),
      ...(colStart !== undefined && { gridColumnStart: colStart }),
      ...(colEnd !== undefined && { gridColumnEnd: colEnd }),
      ...(rowStart !== undefined && { gridRowStart: rowStart }),
      ...(rowEnd !== undefined && { gridRowEnd: rowEnd }),
      ...(area && { gridArea: area }),
      ...(alignSelf && { alignSelf: mapAlignment(alignSelf) }),
      ...(justifySelf && { justifySelf: mapAlignment(justifySelf) as React.CSSProperties['justifySelf'] }),
      ...style,
    };

    return (
      <div ref={ref} style={gridItemStyles} {...rest}>
        {children}
      </div>
    );
  }
);

GridItem.displayName = 'GridItem';

/**
 * Simple Grid - Auto-layout grid with responsive columns
 */
export interface SimpleGridProps extends Omit<GridProps, 'columns'> {
  /** Minimum column width for auto-fit layout */
  minChildWidth?: string;

  /** Fixed number of columns */
  columns?: number | { sm?: number; md?: number; lg?: number; xl?: number };
}

export const SimpleGrid = forwardRef<HTMLDivElement, SimpleGridProps>(
  ({ minChildWidth, columns, ...rest }, ref) => {
    let gridColumns: string | undefined;

    if (minChildWidth) {
      gridColumns = `repeat(auto-fit, minmax(${minChildWidth}, 1fr))`;
    } else if (typeof columns === 'number') {
      gridColumns = `repeat(${columns}, minmax(0, 1fr))`;
    }

    return <Grid ref={ref} columns={gridColumns || (columns as string)} {...rest} />;
  }
);

SimpleGrid.displayName = 'SimpleGrid';

// Type exports
export type { GridProps as GridStyleProps };
