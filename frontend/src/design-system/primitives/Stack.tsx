/**
 * Stack Primitive
 * Simplified vertical/horizontal stacking with consistent spacing
 */

import { forwardRef, type ReactNode, Children, isValidElement, cloneElement, type HTMLAttributes } from 'react';
import { Flex, type FlexProps } from './Flex';
import { spacing, type SpacingKey } from '../tokens/spacing';

/**
 * Stack-specific props
 */
export interface StackProps extends Omit<FlexProps, 'direction' | 'gap'> {
  /** Stack direction */
  direction?: 'vertical' | 'horizontal';

  /** Spacing between items */
  spacing?: SpacingKey;

  /** Whether to reverse the order of items */
  reverse?: boolean;

  /** Divider element to render between items */
  divider?: ReactNode;

  /** Whether to add spacing around dividers */
  dividerSpacing?: SpacingKey;

  /** Children */
  children?: ReactNode;
}

/**
 * Stack Component
 * Renders children in a vertical or horizontal stack with consistent spacing
 */
export const Stack = forwardRef<HTMLDivElement, StackProps>(
  (
    {
      direction = 'vertical',
      spacing: spacingProp = 4,
      reverse = false,
      divider,
      dividerSpacing,
      children,
      ...rest
    },
    ref
  ) => {
    // Map direction to flex direction
    const flexDirection = direction === 'vertical'
      ? (reverse ? 'column-reverse' : 'column')
      : (reverse ? 'row-reverse' : 'row');

    // If no divider, use simple gap-based layout
    if (!divider) {
      return (
        <Flex ref={ref} direction={flexDirection} gap={spacingProp} {...rest}>
          {children}
        </Flex>
      );
    }

    // With divider, we need to interleave children with divider elements
    const validChildren = Children.toArray(children).filter(isValidElement);
    const childCount = validChildren.length;

    const childrenWithDividers = validChildren.reduce<ReactNode[]>((acc, child, index) => {
      // Clone child with key
      const clonedChild = cloneElement(child, { key: `stack-child-${index}` });
      acc.push(clonedChild);

      // Add divider between items (not after the last one)
      if (index < childCount - 1) {
        const dividerElement = (
          <StackDivider
            key={`stack-divider-${index}`}
            direction={direction}
            spacing={dividerSpacing || spacingProp}
          >
            {divider}
          </StackDivider>
        );
        acc.push(dividerElement);
      }

      return acc;
    }, []);

    return (
      <Flex ref={ref} direction={flexDirection} {...rest}>
        {childrenWithDividers}
      </Flex>
    );
  }
);

Stack.displayName = 'Stack';

/**
 * Internal divider wrapper for proper spacing
 */
interface StackDividerProps extends HTMLAttributes<HTMLDivElement> {
  direction: 'vertical' | 'horizontal';
  spacing: SpacingKey;
  children: ReactNode;
}

function StackDivider({ direction, spacing: spacingKey, children, ...rest }: StackDividerProps) {
  const spacingValue = spacing[spacingKey];
  const style: React.CSSProperties = direction === 'vertical'
    ? { marginTop: spacingValue, marginBottom: spacingValue }
    : { marginLeft: spacingValue, marginRight: spacingValue };

  return <div style={style} {...rest}>{children}</div>;
}

/**
 * Convenience wrapper for vertical stacking
 */
export const VStack = forwardRef<HTMLDivElement, Omit<StackProps, 'direction'>>(
  (props, ref) => <Stack ref={ref} direction="vertical" {...props} />
);
VStack.displayName = 'VStack';

/**
 * Convenience wrapper for horizontal stacking
 */
export const HStack = forwardRef<HTMLDivElement, Omit<StackProps, 'direction'>>(
  (props, ref) => <Stack ref={ref} direction="horizontal" {...props} />
);
HStack.displayName = 'HStack';
