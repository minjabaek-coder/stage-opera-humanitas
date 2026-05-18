export function Audience() {
  return (
    <section className="audience band" id="audience">
      <div className="container">
        <div className="audience__grid">
          <div data-reveal="">
            <div className="eyebrow" style={{ marginBottom: 14 }}>
              — For Whom · 05
            </div>
            <h2
              style={{
                fontFamily: "var(--font-serif-latin)",
                fontWeight: 400,
                fontSize: "var(--type-h1)",
                lineHeight: 1,
                letterSpacing: "-0.015em",
                margin: 0,
              }}
            >
              이런 분들께.
            </h2>
            <p
              style={{
                fontFamily: "var(--font-serif-latin)",
                fontStyle: "italic",
                color: "var(--ink-dim)",
                marginTop: 18,
                fontSize: "var(--type-lead)",
              }}
            >
              For those who listen with both ear and mind.
            </p>
          </div>

          <ol
            className="audience__list"
            data-reveal=""
            style={{ ["--reveal-delay" as string]: "160ms" } as React.CSSProperties}
          >
            <li>공연이 어렵게 느껴졌던 사람</li>
            <li>오페라를 더 깊이 듣고 싶은 사람</li>
            <li>책과 음악을 함께 좋아하는 사람</li>
            <li>예술을 인문학으로 읽고 싶은 사람</li>
          </ol>
        </div>
      </div>
    </section>
  );
}
