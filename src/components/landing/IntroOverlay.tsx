"use client";

import { useEffect, useState } from "react";

export function IntroOverlay() {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGone(true), 2400);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className={`intro${gone ? " gone" : ""}`} id="intro">
      <div className="intro__mark">
        <span>OPERA</span>
        <span>HUMANITAS</span>
      </div>
      <div className="intro__lat">A Series in Four Nights · MMXXVI</div>
    </div>
  );
}
