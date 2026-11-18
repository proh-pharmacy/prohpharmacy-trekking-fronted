import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface FlatTabItem<T extends string = string> {
  value: T;
  label: string;
  id?: string;
  ariaControls?: string;
  icon?: string | ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface FlatTabsProps<T extends string = string> {
  tabs: FlatTabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  uppercase?: boolean;
  /** Matches the background underneath the tab strip so the active tab flows seamlessly into it. */
  flowBackground?: 'canvas' | 'surface';
  className?: string;
}

interface TabGeometry {
  x0: number;
  x1: number;
  width: number;
  height: number;
}

const CORNER_RADIUS = 8;
const TOP_INSET = 6;
const ANIMATION_DURATION_MS = 280;

function buildFolderTabPaths({ x0, x1, width, height }: TabGeometry): { stroke: string; fill: string } {
  if (width <= 0 || height <= 0) return { stroke: '', fill: '' };
  const yTop = TOP_INSET + 0.5;
  const yBottom = height - 0.5;
  const maxR = Math.max(0, Math.min(CORNER_RADIUS, (yBottom - yTop) / 2, (x1 - x0) / 2));
  const leftFlange = Math.min(maxR, Math.max(0, x0));
  const rightFlange = Math.min(maxR, Math.max(0, width - x1));

  const tabContour = [
    leftFlange > 0
      ? `A ${leftFlange} ${leftFlange} 0 0 0 ${x0} ${yBottom - leftFlange}`
      : `L ${x0} ${yBottom}`,
    `L ${x0} ${yTop + maxR}`,
    `A ${maxR} ${maxR} 0 0 1 ${x0 + maxR} ${yTop}`,
    `L ${x1 - maxR} ${yTop}`,
    `A ${maxR} ${maxR} 0 0 1 ${x1} ${yTop + maxR}`,
    `L ${x1} ${yBottom - rightFlange}`,
    rightFlange > 0
      ? `A ${rightFlange} ${rightFlange} 0 0 0 ${x1 + rightFlange} ${yBottom}`
      : `L ${x1} ${yBottom}`,
  ].join(' ');

  const stroke = [
    `M 0 ${yBottom}`,
    `L ${x0 - leftFlange} ${yBottom}`,
    tabContour,
    `L ${width} ${yBottom}`,
  ].join(' ');

  const fill = [
    `M ${x0 - leftFlange} ${height}`,
    `L ${x0 - leftFlange} ${yBottom}`,
    tabContour,
    `L ${x1 + rightFlange} ${height}`,
    'Z',
  ].join(' ');

  return { stroke, fill };
}

export function FlatTabs<T extends string = string>({
  tabs,
  value,
  onChange,
  ariaLabel = 'Tabs',
  uppercase = true,
  flowBackground = 'canvas',
  className = '',
}: FlatTabsProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tabButtonRefs = useRef<Map<T, HTMLButtonElement>>(new Map());
  const currentGeomRef = useRef<TabGeometry | null>(null);
  const targetGeomRef = useRef<TabGeometry | null>(null);
  const rafRef = useRef<number | null>(null);
  const [geometry, setGeometry] = useState<TabGeometry | null>(null);

  const measureActiveTab = useCallback((): TabGeometry | null => {
    const container = containerRef.current;
    const activeButton = tabButtonRefs.current.get(value);
    if (!container || !activeButton) return null;

    const width = Math.max(container.scrollWidth, container.clientWidth);
    const height = container.clientHeight;
    const x0 = activeButton.offsetLeft;
    const x1 = x0 + activeButton.offsetWidth;

    return { x0, x1, width, height };
  }, [value]);

  const measureRef = useRef(measureActiveTab);
  measureRef.current = measureActiveTab;

  const animateToTarget = useCallback((target: TabGeometry, immediate: boolean) => {
    targetGeomRef.current = target;

    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const from = currentGeomRef.current;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (immediate || !from || prefersReducedMotion) {
      currentGeomRef.current = target;
      setGeometry(target);
      return;
    }

    if (
      Math.abs(from.x0 - target.x0) < 0.5 &&
      Math.abs(from.x1 - target.x1) < 0.5
    ) {
      currentGeomRef.current = target;
      setGeometry(target);
      return;
    }

    const startFrom = { ...from };
    const startTime = performance.now();
    const tick = (now: number) => {
      const latestTarget = targetGeomRef.current ?? target;
      const progress = Math.min(1, (now - startTime) / ANIMATION_DURATION_MS);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next: TabGeometry = {
        x0: startFrom.x0 + (latestTarget.x0 - startFrom.x0) * eased,
        x1: startFrom.x1 + (latestTarget.x1 - startFrom.x1) * eased,
        width: latestTarget.width,
        height: latestTarget.height,
      };
      currentGeomRef.current = next;
      setGeometry(next);

      if (progress < 1) {
        rafRef.current = window.requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = window.requestAnimationFrame(tick);
  }, []);

  useLayoutEffect(() => {
    const next = measureActiveTab();
    if (!next) return;
    const isInitial = currentGeomRef.current === null;
    animateToTarget(next, isInitial);
  }, [measureActiveTab, animateToTarget]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(() => {
      const next = measureRef.current();
      if (!next) return;
      targetGeomRef.current = next;
      // Never cancel an active tab-switch glide when layout/scrollbar width changes mid-transition
      if (rafRef.current != null) return;
      currentGeomRef.current = next;
      setGeometry(next);
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const paths = geometry ? buildFolderTabPaths(geometry) : null;
  const activeFill =
    flowBackground === 'surface' ? 'var(--color-portal-surface)' : 'var(--color-portal-canvas)';
  const containmentBg =
    flowBackground === 'surface' ? 'bg-portal-canvas/55' : 'bg-portal-surface/65';

  return (
    <div className={`flat-tabs-shell w-full overflow-x-auto ${containmentBg} ${className}`}>
      <div
        ref={containerRef}
        role="tablist"
        aria-label={ariaLabel}
        className="relative inline-flex min-w-full items-end gap-1 pl-3 pr-4 pt-2 select-none whitespace-nowrap"
      >
        {/* Continuous single-stroke baseline + active tab cutout matching page/card background */}
        {geometry && paths?.stroke ? (
          <svg
            aria-hidden="true"
            width={geometry.width}
            height={geometry.height}
            viewBox={`0 0 ${geometry.width} ${geometry.height}`}
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 overflow-visible"
          >
            <path d={paths.fill} fill={activeFill} />
            <path
              d={paths.stroke}
              fill="none"
              stroke="var(--color-portal-muted)"
              strokeOpacity="0.28"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-portal-muted/25"
          />
        )}

        {tabs.map((tab) => {
          const isActive = tab.value === value;
          return (
            <button
              key={tab.value}
              id={tab.id}
              ref={(el) => {
                if (el) tabButtonRefs.current.set(tab.value, el);
                else tabButtonRefs.current.delete(tab.value);
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={tab.ariaControls}
              disabled={tab.disabled}
              onClick={() => onChange(tab.value)}
              className={`relative z-10 inline-flex items-center gap-2 px-5 py-2.5 transition-colors duration-200 cursor-pointer !rounded-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                uppercase ? 'text-xs uppercase tracking-wider' : 'text-sm'
              } ${
                isActive
                  ? 'font-semibold text-portal-accent'
                  : 'font-medium text-portal-muted hover:text-portal-heading'
              }`}
            >
              {tab.icon && (
                typeof tab.icon === 'string'
                  ? <i className={`${tab.icon} text-xs shrink-0`} aria-hidden="true" />
                  : <span className="inline-flex shrink-0 items-center" aria-hidden="true">{tab.icon}</span>
              )}
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge !== null && (
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    isActive ? 'text-portal-accent' : 'text-portal-muted'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default FlatTabs;
