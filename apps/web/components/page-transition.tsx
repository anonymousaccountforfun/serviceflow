'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * PageTransition - CSS-only page transition wrapper
 *
 * Provides smooth fade-in and slide-up animations when navigating
 * between dashboard pages. Respects prefers-reduced-motion settings.
 *
 * Usage:
 *   <PageTransition>{children}</PageTransition>
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);

  useEffect(() => {
    // Trigger animation on route change
    setIsAnimating(true);
    setDisplayChildren(children);

    // Reset animation state after transition completes
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 200); // Match animation duration

    return () => clearTimeout(timer);
  }, [pathname, children]);

  return (
    <div
      className={`page-transition ${isAnimating ? 'page-transition-enter' : ''}`}
      key={pathname}
    >
      {displayChildren}
    </div>
  );
}

/**
 * FadeIn - Simple fade-in wrapper for individual elements
 *
 * Use for staggered animations or specific components that need
 * to fade in independently of the page transition.
 */
export function FadeIn({
  children,
  delay = 0,
  className = ''
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={`fade-in ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/**
 * SlideUp - Slide-up animation wrapper
 *
 * Use for cards, list items, or content that should slide up
 * when entering the viewport.
 */
export function SlideUp({
  children,
  delay = 0,
  className = ''
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={`slide-up ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/**
 * StaggeredList - Applies staggered animations to list children
 *
 * Usage:
 *   <StaggeredList staggerDelay={50}>
 *     {items.map(item => <Card key={item.id} />)}
 *   </StaggeredList>
 */
export function StaggeredList({
  children,
  staggerDelay = 50,
  className = ''
}: {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.isArray(children)
        ? children.map((child, index) => (
            <div
              key={index}
              className="slide-up"
              style={{ animationDelay: `${index * staggerDelay}ms` }}
            >
              {child}
            </div>
          ))
        : children
      }
    </div>
  );
}
