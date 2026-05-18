"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PROGRAMS, type Program, type ProgramAvailability } from "@/data/programs";
import { useOperaPlayer } from "./useOperaPlayer";

type Props = { availability: ProgramAvailability[] };

function seatLabel(a: ProgramAvailability | undefined) {
  if (!a) return null;
  if (a.isSoldOut || a.availableCount <= 0) {
    return <div className="s-seats s-seats--soldout">SOLD OUT</div>;
  }
  if (a.availableCount <= 5) {
    return <div className="s-seats s-seats--low">남은 자리 {a.availableCount}석</div>;
  }
  if (a.availableCount <= 15) {
    return <div className="s-seats">남은 자리 {a.availableCount}석</div>;
  }
  return null;
}

export function Series({ availability }: Props) {
  const { play, playingKey } = useOperaPlayer();
  const byId = new Map(availability.map((a) => [a.programId, a] as const));

  // Row reveal lives in React state — without this, the global RevealObserver
  // adds `in` via classList.add, but the next re-render (e.g. play toggle)
  // overwrites className and strips it, leaving the row at opacity:0.
  const rowRefs = useRef<Map<number, HTMLElement | null>>(new Map());
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      queueMicrotask(() => setRevealed(new Set(PROGRAMS.map((p) => p.id))));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const ids: number[] = [];
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = Number((entry.target as HTMLElement).dataset.programId);
            if (Number.isFinite(id)) ids.push(id);
            io.unobserve(entry.target);
          }
        }
        if (ids.length) {
          setRevealed((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => next.add(id));
            return next;
          });
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
    );
    rowRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section className="series band" id="series">
      <div className="container">
        <div className="band__head" data-reveal="">
          <div className="num">— Programme · 03</div>
          <h2 className="title">
            Quattuor noctes — <em>네 개의 밤.</em>
          </h2>
          <p className="kr">사랑 · 청춘 · 욕망 · 자유 — 네 편의 오페라, 네 번의 사유.</p>
        </div>

        <div className="series__list" role="list">
          {PROGRAMS.map((p: Program) => {
            const a = byId.get(p.id);
            const soldOut = !!a?.isSoldOut || (a?.availableCount ?? 24) <= 0;
            const isPlaying = playingKey === p.code;
            const isRevealed = revealed.has(p.id);
            return (
              <article
                key={p.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(p.id, el);
                  else rowRefs.current.delete(p.id);
                }}
                role="listitem"
                data-reveal=""
                data-opera={p.code}
                data-program-id={p.id}
                className={`series__row${isRevealed ? " in" : ""}${isPlaying ? " is-playing" : ""}${soldOut ? " is-soldout" : ""}`}
              >
                <div className="s-num">{p.romanNumeral}.</div>
                <div>
                  <div className="s-composer">{p.composer}</div>
                  <h3 className="s-title">
                    {p.titleLatin}
                    <span className="kr">{p.titleKo}</span>
                  </h3>
                </div>
                <p className="s-subtitle">{p.subtitle}</p>
                <div className="s-meta">
                  <span className="date">{p.dateLabel}</span>
                  <span>SAT · 15:00</span>
                  {seatLabel(a)}
                </div>
                <div
                  className="s-apply-wrap"
                  style={{ display: "flex", gap: 24, alignItems: "center" }}
                >
                  <button
                    type="button"
                    className="s-play"
                    aria-label={`${p.titleKo} 미리듣기`}
                    aria-pressed={isPlaying}
                    onClick={() => play(p.code)}
                  >
                    <span className="ring" />
                    <svg
                      className="icon icon-play"
                      viewBox="0 0 14 16"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M0 0 L14 8 L0 16 Z" />
                    </svg>
                    <svg
                      className="icon icon-pause"
                      viewBox="0 0 14 16"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <rect x="0" y="0" width="5" height="16" />
                      <rect x="9" y="0" width="5" height="16" />
                    </svg>
                  </button>
                  {soldOut ? (
                    <span className="s-apply s-apply--disabled" aria-disabled="true">
                      Sold Out
                    </span>
                  ) : (
                    <Link className="s-apply" href={`/apply?program=${p.id}`}>
                      Apply →
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div className="series__legend" data-reveal="">
          <div>
            Preview <strong>각 회차 미리듣기 — 1분</strong>
          </div>
          <div>
            Format <strong>강연 90분 + 살롱 토크 30분</strong>
          </div>
          <div>
            Seats <strong>한 회차 24석 한정</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
