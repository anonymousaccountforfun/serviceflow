import { clsx } from 'clsx';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The shape of the skeleton
   * @default 'rectangular'
   */
  variant?: 'rectangular' | 'circular' | 'text';
  /**
   * The animation style
   * @default 'pulse'
   */
  animation?: 'pulse' | 'shimmer' | 'none';
  /**
   * Width of the skeleton (CSS value)
   */
  width?: string | number;
  /**
   * Height of the skeleton (CSS value)
   */
  height?: string | number;
}

/**
 * Base Skeleton component for loading states.
 * Matches the ServiceFlow dark theme with navy backgrounds.
 */
export function Skeleton({
  className,
  variant = 'rectangular',
  animation = 'pulse',
  width,
  height,
  style,
  ...props
}: SkeletonProps) {
  const variantStyles = {
    rectangular: 'rounded-md',
    circular: 'rounded-full',
    text: 'rounded h-4',
  };

  const animationStyles = {
    pulse: 'animate-pulse',
    shimmer: 'skeleton-shimmer',
    none: '',
  };

  return (
    <div
      className={clsx(
        'bg-navy-700',
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      aria-hidden="true"
      role="presentation"
      {...props}
    />
  );
}

interface SkeletonTextProps {
  /**
   * Number of lines to display
   * @default 3
   */
  lines?: number;
  /**
   * Width of the last line (CSS value or percentage)
   * @default '60%'
   */
  lastLineWidth?: string;
  /**
   * Gap between lines
   * @default 'gap-2'
   */
  gap?: string;
  /**
   * Animation style
   * @default 'pulse'
   */
  animation?: 'pulse' | 'shimmer' | 'none';
  className?: string;
}

/**
 * Skeleton for text content with multiple lines.
 * The last line is shorter by default for a more natural appearance.
 */
export function SkeletonText({
  lines = 3,
  lastLineWidth = '60%',
  gap = 'gap-2',
  animation = 'pulse',
  className,
}: SkeletonTextProps) {
  return (
    <div className={clsx('flex flex-col', gap, className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          animation={animation}
          className="h-4"
          style={{
            width: index === lines - 1 ? lastLineWidth : '100%',
          }}
        />
      ))}
    </div>
  );
}

interface SkeletonAvatarProps {
  /**
   * Size of the avatar
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Animation style
   * @default 'pulse'
   */
  animation?: 'pulse' | 'shimmer' | 'none';
  className?: string;
}

/**
 * Skeleton for user avatars.
 * Circular shape with preset sizes matching common avatar dimensions.
 */
export function SkeletonAvatar({
  size = 'md',
  animation = 'pulse',
  className,
}: SkeletonAvatarProps) {
  const sizeStyles = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <Skeleton
      variant="circular"
      animation={animation}
      className={clsx(sizeStyles[size], className)}
    />
  );
}

interface SkeletonCardProps {
  /**
   * Show a header section with icon placeholder
   * @default true
   */
  showHeader?: boolean;
  /**
   * Show metric/value placeholder
   * @default true
   */
  showMetric?: boolean;
  /**
   * Show footer/trend section
   * @default true
   */
  showFooter?: boolean;
  /**
   * Animation style
   * @default 'pulse'
   */
  animation?: 'pulse' | 'shimmer' | 'none';
  className?: string;
}

/**
 * Skeleton for dashboard stat cards.
 * Matches the MetricBlock component pattern used in the dashboard.
 */
export function SkeletonCard({
  showHeader = true,
  showMetric = true,
  showFooter = true,
  animation = 'pulse',
  className,
}: SkeletonCardProps) {
  return (
    <div className={clsx('bg-surface rounded-lg p-5 lg:p-6', className)}>
      {showHeader && (
        <div className="flex items-center justify-between mb-3">
          <Skeleton
            animation={animation}
            className="h-4 w-24"
          />
          <Skeleton
            animation={animation}
            className="h-5 w-5"
            variant="rectangular"
          />
        </div>
      )}
      {showMetric && (
        <div className="flex items-end gap-3 mb-3">
          <Skeleton
            animation={animation}
            className="h-14 lg:h-16 w-32"
          />
          <Skeleton
            animation={animation}
            className="h-5 w-16 mb-2"
          />
        </div>
      )}
      {showFooter && (
        <div className="flex items-center gap-2">
          <Skeleton
            animation={animation}
            className="h-4 w-4"
          />
          <Skeleton
            animation={animation}
            className="h-4 w-20"
          />
        </div>
      )}
    </div>
  );
}

interface SkeletonRowProps {
  /**
   * Show avatar/icon on the left
   * @default true
   */
  showAvatar?: boolean;
  /**
   * Number of text lines
   * @default 2
   */
  textLines?: number;
  /**
   * Show action button/icon on the right
   * @default true
   */
  showAction?: boolean;
  /**
   * Avatar size
   * @default 'md'
   */
  avatarSize?: 'sm' | 'md' | 'lg';
  /**
   * Animation style
   * @default 'pulse'
   */
  animation?: 'pulse' | 'shimmer' | 'none';
  className?: string;
}

/**
 * Skeleton for list/table rows.
 * Flexible layout matching common row patterns with avatar, text, and actions.
 */
export function SkeletonRow({
  showAvatar = true,
  textLines = 2,
  showAction = true,
  avatarSize = 'md',
  animation = 'pulse',
  className,
}: SkeletonRowProps) {
  const avatarSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  return (
    <div
      className={clsx(
        'flex items-center gap-3 p-3 bg-navy-800 rounded-lg',
        className
      )}
    >
      {showAvatar && (
        <Skeleton
          animation={animation}
          variant="circular"
          className={avatarSizes[avatarSize]}
        />
      )}
      <div className="flex-1 space-y-2">
        <Skeleton
          animation={animation}
          className="h-4 w-3/4"
        />
        {textLines > 1 && (
          <Skeleton
            animation={animation}
            className="h-3 w-1/2"
          />
        )}
        {textLines > 2 && (
          <Skeleton
            animation={animation}
            className="h-3 w-1/3"
          />
        )}
      </div>
      {showAction && (
        <Skeleton
          animation={animation}
          className="h-4 w-4 flex-shrink-0"
        />
      )}
    </div>
  );
}

interface SkeletonTableProps {
  /**
   * Number of rows to display
   * @default 5
   */
  rows?: number;
  /**
   * Number of columns
   * @default 4
   */
  columns?: number;
  /**
   * Show table header
   * @default true
   */
  showHeader?: boolean;
  /**
   * Animation style
   * @default 'pulse'
   */
  animation?: 'pulse' | 'shimmer' | 'none';
  className?: string;
}

/**
 * Skeleton for table layouts.
 * Creates a grid of skeleton cells for tabular data loading states.
 */
export function SkeletonTable({
  rows = 5,
  columns = 4,
  showHeader = true,
  animation = 'pulse',
  className,
}: SkeletonTableProps) {
  return (
    <div className={clsx('w-full', className)}>
      {showHeader && (
        <div
          className="grid gap-4 p-3 border-b border-white/10"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={`header-${i}`}
              animation={animation}
              className="h-4"
            />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="grid gap-4 p-3 border-b border-white/5"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={`cell-${rowIndex}-${colIndex}`}
              animation={animation}
              className="h-4"
              style={{ width: colIndex === 0 ? '80%' : '60%' }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface SkeletonListProps {
  /**
   * Number of items to display
   * @default 3
   */
  count?: number;
  /**
   * Row configuration
   */
  rowProps?: Omit<SkeletonRowProps, 'className'>;
  /**
   * Gap between items
   * @default 'gap-3'
   */
  gap?: string;
  className?: string;
}

/**
 * Skeleton for lists of items.
 * Renders multiple SkeletonRow components.
 */
export function SkeletonList({
  count = 3,
  rowProps,
  gap = 'gap-3',
  className,
}: SkeletonListProps) {
  return (
    <div className={clsx('flex flex-col', gap, className)}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonRow key={index} {...rowProps} />
      ))}
    </div>
  );
}
