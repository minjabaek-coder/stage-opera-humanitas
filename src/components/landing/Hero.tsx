export function Hero() {
  return (
    <header className="hero" id="hero">
      <div className="hero__bg" id="hero-bg" />
      <div className="hero__veil" />

      <div className="hero__topbar">
        <div className="mark">OPERA HUMANITAS&nbsp;</div>
        <div className="meta">
          <span>A Lecture Concert Series</span>
          <span>Seoul · 2026</span>
        </div>
      </div>

      <div className="hero__body">
        <div className="hero__opera">A Series in Four Nights — IV &amp; V</div>

        <h1 className="hero__title" id="hero-title">
          <span className="row">
            <span className="word word--opera">Opera</span>
          </span>
          <span className="row">
            <span className="word word--humanitas">Humanitas.</span>
          </span>
        </h1>

        <p className="hero__lat">Per cantum, per scaenam — vitae et artis cogitatio.</p>

        <p className="hero__kr">
          음악처럼 존재하는
          <br />
          삶과 예술의 사유.
        </p>

        <div className="hero__meta">
          <span>4 Nights · 2026.06.20 → 07.11</span>
          <span>ART SPACE HOSEO · Seoul</span>
          <a href="/apply">지금 신청하기 →</a>
        </div>
      </div>

      <div className="hero__scroll">Scroll</div>
    </header>
  );
}
