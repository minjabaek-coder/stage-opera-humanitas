"use client";

import { useEffect } from "react";

// Adds `.in` to any [data-reveal] element when it enters the viewport.
// Also coordinates the hero choreography (bg fade-in, title word stagger)
// that fires ~2s after mount, before the intro overlay fully fades out.
export function RevealObserver() {
  useEffect(() => {
    const heroBg = document.getElementById("hero-bg");
    const heroTitle = document.getElementById("hero-title");
    const heroTimer = window.setTimeout(() => {
      heroBg?.classList.add("in");
      heroTitle?.classList.add("in");
    }, 2000);

    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    let io: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add("in");
              io?.unobserve(entry.target);
            }
          }
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
      );
      els.forEach((el) => io!.observe(el));
    } else {
      els.forEach((el) => el.classList.add("in"));
    }

    // Subtle hero parallax — only while hero is on-screen.
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (heroBg && y < window.innerHeight) {
          heroBg.style.transform = `scale(1) translateY(${y * 0.18}px)`;
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.clearTimeout(heroTimer);
      io?.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return null;
}
