import Image from "next/image";

export function Speaker() {
  return (
    <section className="speaker band" id="speaker">
      <div className="container">
        <div className="band__head" data-reveal="">
          <div className="num">— Speaker · 02</div>
          <h2 className="title">
            Park Kyung-jun, <em>baritone</em>.
          </h2>
          <p className="kr">
            대한민국 최초 오페라 인문학자 · 바리톤 · 『오페라 인문학 IV · V』 저자
          </p>
        </div>

        <div className="speaker__grid">
          <figure className="speaker__image" data-reveal="">
            <Image
              src="/images/speaker.jpg"
              alt="박경준 — 살롱 강연"
              width={1200}
              height={1500}
              priority
            />
            <figcaption className="cap">Salon · Opera Humanitas, Seoul</figcaption>
          </figure>

          <div
            className="speaker__copy"
            data-reveal=""
            style={{ ["--reveal-delay" as string]: "160ms" } as React.CSSProperties}
          >
            <div className="speaker__role">
              Korea&rsquo;s First Opera Humanist · Baritone · Author
              <span className="kr">대한민국 최초 오페라 인문학자 · 바리톤 · 저자</span>
            </div>

            <p className="speaker__bio">
              그는 해설자가 아니다.{" "}
              <strong>
                모차르트의 피가로, 베르디의 리골레토, 푸치니의 마르첼로
              </strong>
              를 실제 무대에서 노래해온 바리톤이자, 한국에서 처음으로 오페라를
              인문학으로 읽어낸 <strong>대한민국 최초 오페라 인문학자</strong>다.
            </p>

            <p className="speaker__bio" style={{ marginTop: 24 }}>
              『오페라 인문학 IV』『오페라 인문학 V』는 그가 무대에서 길어 올린 한
              문장의 사유들. 이번 시리즈는 그 책의 세계관이 무대로 확장되는 시간이다.
            </p>

            <dl className="speaker__credits">
              <dt>Roles</dt>
              <dd>Figaro · Rigoletto · Marcello · Escamillo</dd>
              <dt>Books</dt>
              <dd>오페라 인문학 IV (2024) · V (2026)</dd>
              <dt>Title</dt>
              <dd>대한민국 최초 오페라 인문학자</dd>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
