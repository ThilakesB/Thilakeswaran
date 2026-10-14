"use client";

import React, {
  type CSSProperties,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

/* Inline stand-in for @gsap/react's useGSAP. Mirrors its default
   `revertOnUpdate: false`: one gsap.context lives for the component's
   lifetime, the callback is re-added when dependencies change, and the
   context is reverted only on unmount. A callback may return its own
   cleanup, which runs before the next re-add and on unmount. */
function useGSAP(
  callback: () => void | (() => void),
  options?: {
    dependencies?: unknown[];
    scope?: { current: Element | null } | Element | null;
  }
) {
  const deps = options?.dependencies ?? [];
  const scope = options?.scope;
  const ctxRef = useRef<gsap.Context | null>(null);
  const cleanupRef = useRef<(() => void) | undefined>(undefined);

  useLayoutEffect(() => {
    const el =
      scope && typeof scope === "object" && "current" in scope
        ? scope.current
        : (scope as Element | null);
    ctxRef.current = gsap.context(() => {}, el ?? undefined);
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = undefined;
      ctxRef.current?.revert();
      ctxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (!ctxRef.current) return;
    cleanupRef.current?.();
    const ret = ctxRef.current.add(callback);
    cleanupRef.current = typeof ret === "function" ? ret : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export type TimelineItem = {
  id: string;
  label: string;
  sublabel?: string;
  content: string;
  date?: string;
  href?: string;
  tags?: string[];
  icon?: string;
  badgeImage?: string;
};

type SplitTextInstance = InstanceType<typeof SplitText>;

export type TimelineProps = {
  id?: string;
  idPrefix?: string;
  title?: string;
  periodLabel?: string;
  items: TimelineItem[];
  textColor?: string;
  mutedTextColor?: string;
  activeColor?: string;
  backgroundColor?: string;
  imageUrl?: string;
  imageAlt?: string;
  /** Reveal animation duration, in seconds. */
  duration?: number;
  /** Fallback reveal duration when `duration` is omitted, in seconds. */
  scrollDuration?: number;
  className?: string;
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const mediaQueryList = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQueryList.addEventListener("change", callback);

  return () => mediaQueryList.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;

  return window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches ?? false;
}

function getServerReducedMotionSnapshot() {
  return false;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot
  );
}

const sanitizeId = (id: string, prefix = "") =>
  `${prefix}${id}`.replace(/[^a-zA-Z0-9_-]/g, "-");

export default function Timeline({
  id = "timeline",
  idPrefix = "tl-",
  title = "Timeline",
  periodLabel,
  items = [],
  textColor = "var(--color-foreground, #000000)",
  mutedTextColor = "var(--color-muted-foreground, #3f3f46)",
  activeColor = "#000000",
  backgroundColor = "var(--color-background, #ffffff)",
  imageUrl,
  imageAlt = "Timeline illustration",
  duration,
  scrollDuration = 1.2,
  className = "",
}: TimelineProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const wholeSliderRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const animationDuration = duration ?? scrollDuration;
  const normalizedDuration = Math.max(0.2, animationDuration);

  // Even index -> top row, Odd index -> bottom row
  const topJourneyData = items.filter((_, idx) => idx % 2 === 0);
  const bottomJourneyData = items.filter((_, idx) => idx % 2 === 1);
  const allJourneyItems = items;

  const sectionStyle: CSSProperties = {
    color: textColor,
    backgroundColor,
  };
  const activeStyle: CSSProperties = {
    backgroundColor: activeColor,
  };
  const mutedTextStyle: CSSProperties = {
    color: mutedTextColor,
  };

  // Dynamic sizing calculations based on item count
  const itemCount = Math.max(1, items.length);
  const desktopWidthVw = Math.max(160, itemCount * 36 + (imageUrl ? 35 : 15));
  const mobileWidthVw = Math.max(280, itemCount * 85 + (imageUrl ? 90 : 20));

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section || allJourneyItems.length === 0) return;

      const isMobile = window.innerWidth < 600;
      const totalWidth = isMobile ? mobileWidthVw : desktopWidthVw;
      // Calculate how far to slide so all content scrolls through
      const slidePercent = -Math.min(88, Math.max(40, ((totalWidth - 95) / totalWidth) * 100));

      const lineWidth = isMobile ? "75%" : "98%";
      const lineStart = isMobile ? "top 30%" : "top 25%";
      const slideEnd = isMobile ? "85% 50%" : "92% bottom";
      const lineEnd = isMobile ? "82% 50%" : "92% bottom";

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: slideEnd,
          scrub: true,
        },
        defaults: {
          ease: "none",
        },
      });

      tl.fromTo(
        wholeSliderRef.current,
        { xPercent: 0 },
        { xPercent: slidePercent }
      );

      const journeyLineClass = `.${idPrefix}journey-line`;
      if (reducedMotion) {
        gsap.set(journeyLineClass, { width: lineWidth });
        return;
      }

      gsap.to(journeyLineClass, {
        width: lineWidth,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: lineStart,
          end: lineEnd,
          scrub: true,
        },
      });
    },
    { dependencies: [reducedMotion, items, desktopWidthVw, mobileWidthVw], scope: sectionRef }
  );

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section || allJourneyItems.length === 0) return;

      const prefix = idPrefix;

      if (reducedMotion) {
        allJourneyItems.forEach((item) => {
          const sId = sanitizeId(item.id, prefix);
          gsap.set(`.jl-${sId}`, { scaleY: 1 });
          gsap.set(`.jd-${sId}`, { scale: 1 });
          gsap.set(`.title-${sId}`, { opacity: 1, clearProps: "transform" });
          gsap.set(`.description-${sId}`, {
            opacity: 1,
            clearProps: "transform",
          });
        });
        return;
      }

      allJourneyItems.forEach((item) => {
        const sId = sanitizeId(item.id, prefix);
        gsap.set(`.jl-${sId}`, {
          scaleY: 0,
          transformOrigin: "bottom bottom",
        });
        gsap.set(`.jd-${sId}`, { scale: 0 });
        gsap.set(`.title-${sId}`, { opacity: 1 });
        gsap.set(`.description-${sId}`, { opacity: 1 });
      });

      const titleSplits: Partial<Record<string, SplitTextInstance>> = {};
      const descriptionSplits: Partial<Record<string, SplitTextInstance>> = {};

      allJourneyItems.forEach((item) => {
        const sId = sanitizeId(item.id, prefix);
        try {
          titleSplits[sId] = new SplitText(`.title-${sId}`, {
            type: "chars, words, lines",
            mask: "lines",
          });

          descriptionSplits[sId] = new SplitText(`.description-${sId}`, {
            type: "chars, words, lines",
            mask: "lines",
          });
        } catch {
          // Fallback if SplitText is unavailable
        }
      });

      const createItemTimeline = (
        item: TimelineItem,
        startPos: number,
        endPos: number
      ) => {
        const sId = sanitizeId(item.id, prefix);
        const lineSelector = `.jl-${sId}`;
        const dotSelector = `.jd-${sId}`;
        const titleLines = titleSplits[sId]?.lines || [`.title-${sId}`];
        const descriptionLines = descriptionSplits[sId]?.lines || [`.description-${sId}`];

        const isTop = topJourneyData.some((topItem) => topItem.id === item.id);

        if (!isTop) {
          gsap.set(lineSelector, { transformOrigin: "top top" });
        }

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: `${startPos}% 30%`,
            end: `${endPos}% 50%`,
            scrub: true,
          },
        });

        timeline
          .to(lineSelector, {
            scaleY: 1,
            duration: normalizedDuration * 0.4,
          })
          .to(
            dotSelector,
            {
              scale: 1,
              duration: normalizedDuration * 0.4,
            },
            "<"
          )
          .fromTo(
            titleLines,
            { y: 60, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              delay: -0.6 * normalizedDuration,
              duration: normalizedDuration,
              stagger: 0.02,
              ease: "power2.out",
            }
          )
          .fromTo(
            descriptionLines,
            { y: 60, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: normalizedDuration,
              stagger: 0.02,
              ease: "power2.out",
            },
            "<"
          );

        return timeline;
      };

      // Generate dynamic positions spread across items
      const count = allJourneyItems.length;
      const isMobile = window.innerWidth < 600;
      const minStart = isMobile ? 22 : 6;
      const maxStart = isMobile ? 69 : 65;
      const offset = isMobile ? 10 : 20;

      allJourneyItems.forEach((item, index) => {
        const startPos =
          count === 1
            ? minStart
            : Math.round(minStart + (index / (count - 1)) * (maxStart - minStart));
        const endPos = startPos + offset;
        createItemTimeline(item, startPos, endPos);
      });

      const handleResize = () => {
        ScrollTrigger.refresh();
      };

      window.addEventListener("resize", handleResize);

      // Refresh ScrollTrigger once fonts and images load
      if (typeof document !== "undefined" && document.fonts) {
        document.fonts.ready.then(() => ScrollTrigger.refresh());
      }

      return () => {
        Object.values(titleSplits).forEach((split) => split?.revert?.());
        Object.values(descriptionSplits).forEach((split) => split?.revert?.());
        window.removeEventListener("resize", handleResize);
      };
    },
    { dependencies: [normalizedDuration, reducedMotion, items, idPrefix], scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id={id}
      className={`w-full relative ${className}`}
      style={{
        ...sectionStyle,
        height: `${Math.max(160, itemCount * 28)}vw`,
      }}
    >
      <div className="h-screen w-screen sticky top-0 pt-[8%] overflow-hidden max-[600px]:pt-[12%]">
        <div
          ref={wholeSliderRef}
          className="mr-[2vw] flex h-[32vw] items-center gap-[5vw] px-[5vw] max-[600px]:h-[80vh] max-[600px]:px-[7vw]"
          style={{
            width: `${desktopWidthVw}vw`,
          }}
        >
          {imageUrl && (
            <div className="h-full w-[30vw] shrink-0 overflow-hidden rounded-[1vw] max-[600px]:h-[65vw] max-[600px]:w-[85vw] max-[600px]:rounded-[4vw] border border-black/10 shadow-lg">
              <img
                src={imageUrl}
                alt={imageAlt}
                draggable={false}
                className="h-full w-full object-cover"
                onLoad={() => ScrollTrigger.refresh()}
              />
            </div>
          )}

          <div className="relative h-full w-full">
            {/* Horizontal Timeline Bar */}
            <div className="w-full absolute left-0 top-[50%] -translate-y-1/2 flex items-center h-fit z-0">
              <div
                className="h-[.8vw] max-[600px]:h-[2vw] max-[600px]:w-[2vw] w-[.8vw] rounded-full shrink-0"
                style={activeStyle}
              ></div>
              <div
                className={`h-0.5 w-[0%] rounded-full ${idPrefix}journey-line relative`}
                style={activeStyle}
              >
                <div
                  className="absolute right-[-2px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px]"
                  style={{ borderLeftColor: activeColor }}
                />
              </div>
              <div
                className="h-[.8vw] max-[600px]:h-[2vw] max-[600px]:w-[2vw] w-[.8vw] rounded-full shrink-0"
                style={activeStyle}
              ></div>
            </div>

            {/* Top Row Items */}
            <div className="flex h-1/2 w-full items-center justify-start gap-[1vw]">
              <div className="h-full w-[24vw] pt-[1vw] max-[600px]:h-fit max-[600px]:w-[50vw] max-[600px]:pt-[3vw] shrink-0">
                <h2 className="text-[2.6vw] leading-[1.05] font-serif font-black uppercase max-[600px]:text-[7vw]">
                  {title}
                </h2>
              </div>

              <div className="w-full flex h-full gap-x-[16vw] max-[600px]:gap-x-[36vw]">
                {topJourneyData.map((item) => {
                  const sId = sanitizeId(item.id, idPrefix);
                  return (
                    <div
                      key={`top-${item.id}`}
                      className="relative h-full w-[28vw] px-[2vw] max-[600px]:w-[68vw] max-[600px]:px-[5vw] shrink-0"
                    >
                      <div className="w-full absolute left-0 bottom-0 top-0 h-full pointer-events-none">
                        <div
                          className={`size-[1vw] max-[600px]:size-[2.5vw] translate-x-[-50%] relative aspect-square rounded-full jd-${sId}`}
                          style={activeStyle}
                        ></div>
                        <div
                          className={`h-[94%] w-px origin-bottom rounded-full jl-${sId}`}
                          style={activeStyle}
                        ></div>
                      </div>

                      <div className="mt-[-1vw] space-y-[0.8vw] max-[600px]:mt-[-2vw]">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <h4
                            className={`title-${sId} text-[1.8vw] font-bold leading-snug max-[600px]:text-[5.5vw]`}
                          >
                            {item.label}
                          </h4>
                          {item.sublabel && (
                            <span className="text-[1vw] max-[600px]:text-[3.2vw] opacity-75 font-mono">
                              ({item.sublabel})
                            </span>
                          )}
                        </div>

                        {item.badgeImage && (
                          <div className="flex items-center gap-2 mb-1">
                            <img
                              src={item.badgeImage}
                              alt={`${item.label} Badge`}
                              className="w-10 h-10 object-contain rounded border border-current/20 p-0.5"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}

                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 py-1">
                            {item.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 text-[0.85vw] max-[600px]:text-[2.8vw] rounded-full border border-current font-mono"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <p
                          className={`description-${sId} w-[92%] text-[1.05vw] leading-[1.5] max-[600px]:w-[95%] max-[600px]:text-[3.8vw] font-serif`}
                          style={mutedTextStyle}
                        >
                          {item.content}
                        </p>

                        {item.href && (
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[0.95vw] max-[600px]:text-[3.4vw] font-semibold underline underline-offset-4 hover:opacity-75 pt-1"
                          >
                            Verify Credential &rarr;
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Row Items */}
            <div className="h-1/2 flex items-center justify-start w-full">
              <div className="w-[24vw] pt-[2vw] max-[600px]:pt-[4vw] max-[600px]:w-[50vw] h-full shrink-0">
                {periodLabel && (
                  <p
                    className="text-[1.2vw] font-mono uppercase tracking-wider leading-none max-[600px]:text-[3.8vw]"
                    style={mutedTextStyle}
                  >
                    {periodLabel}
                  </p>
                )}
              </div>

              <div className="w-full flex h-full gap-x-[18vw] ml-[5vw] max-[600px]:gap-x-[36vw] max-[600px]:ml-[7vw]">
                {bottomJourneyData.map((item) => {
                  const sId = sanitizeId(item.id, idPrefix);
                  return (
                    <div
                      key={`bottom-${item.id}`}
                      className="relative h-full w-[28vw] px-[2vw] max-[600px]:w-[68vw] max-[600px]:px-[5vw] shrink-0"
                    >
                      <div className="w-full absolute left-0 bottom-[-1%] h-full pointer-events-none">
                        <div
                          className={`h-[94%] origin-top w-px rounded-full max-[600px]:h-full jl-${sId}`}
                          style={activeStyle}
                        ></div>
                        <div
                          className={`size-[1vw] max-[600px]:size-[2.5vw] translate-x-[-50%] relative w-auto aspect-square rounded-full jd-${sId}`}
                          style={activeStyle}
                        ></div>
                      </div>

                      <div className="flex h-full w-full flex-col justify-end pb-[1vw] space-y-[0.8vw]">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <h4
                            className={`title-${sId} text-[1.8vw] font-bold leading-snug max-[600px]:text-[5.5vw]`}
                          >
                            {item.label}
                          </h4>
                          {item.sublabel && (
                            <span className="text-[1vw] max-[600px]:text-[3.2vw] opacity-75 font-mono">
                              ({item.sublabel})
                            </span>
                          )}
                        </div>

                        {item.badgeImage && (
                          <div className="flex items-center gap-2 mb-1">
                            <img
                              src={item.badgeImage}
                              alt={`${item.label} Badge`}
                              className="w-10 h-10 object-contain rounded border border-current/20 p-0.5"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}

                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 py-1">
                            {item.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 text-[0.85vw] max-[600px]:text-[2.8vw] rounded-full border border-current font-mono"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <p
                          className={`description-${sId} w-[92%] text-[1.05vw] leading-[1.5] max-[600px]:w-[95%] max-[600px]:text-[3.8vw] font-serif`}
                          style={mutedTextStyle}
                        >
                          {item.content}
                        </p>

                        {item.href && (
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[0.95vw] max-[600px]:text-[3.4vw] font-semibold underline underline-offset-4 hover:opacity-75 pt-1"
                          >
                            Verify Credential &rarr;
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
