import Image from "next/image";

export function Books() {
  return (
    <section className="books band" id="books">
      <div className="container">
        <div className="books__grid">
          <div className="books__copy" data-reveal="">
            <div className="eyebrow" style={{ marginBottom: 14 }}>
              — Reading · 04
            </div>
            <h2
              style={{
                fontFamily: "var(--font-serif-latin)",
                fontWeight: 400,
                fontSize: "var(--type-h1)",
                lineHeight: 1,
                letterSpacing: "-0.015em",
                margin: "0 0 24px",
              }}
            >
              강연을 듣고,
              <br />
              <em>책으로</em> 다시 만나다.
            </h2>
            <p>
              『오페라 인문학 IV』『오페라 인문학 V』. 두 권의 책은 이번 시리즈의
              텍스트이자, 시리즈가 끝난 뒤에도 Opera의 여운이 이어지는 방식이다.
            </p>
            <p style={{ marginTop: 16 }}>책은 무대의 메모이고, 무대는 책의 각주다.</p>
            <div className="meta">A Companion to the Salon — vol. IV &amp; V</div>
          </div>

          <div
            className="books__stack"
            data-reveal=""
            style={{ ["--reveal-delay" as string]: "200ms" } as React.CSSProperties}
          >
            <a className="book book--iv" aria-label="오페라 인문학 IV" href="#books">
              <Image src="/images/book-iv.jpg" alt="오페라 인문학 IV — 박경준 저" width={432} height={625} />
              <span className="book__badge">Vol. IV · 2024</span>
            </a>
            <a className="book book--v" aria-label="오페라 인문학 V" href="#books">
              <Image src="/images/book-v.jpg" alt="오페라 인문학 V — 박경준 저" width={432} height={625} />
              <span className="book__badge">Vol. V · 2026</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
