import Image from "next/image";
import Link from "next/link";

export function CTA() {
  return (
    <section className="cta" id="apply">
      <div className="container cta__wrap" data-reveal="">
        <Link className="cta__btn" href="/apply">
          <span>지금 신청하기</span>
          <span className="arrow">→</span>
        </Link>
      </div>

      <div className="container presents" data-reveal="">
        <div className="presents__label">— Presented by</div>
        <div className="presents__grid">
          <a
            className="present"
            href="https://www.kairosse.com/kjpark"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="present__logo present__logo--bon">
              <Image src="/images/logo-bon.jpg" alt="아트컴퍼니본 로고" width={240} height={240} />
            </div>
            <div className="present__meta">
              <div className="present__name">(주) 아트컴퍼니본</div>
              <div className="present__role">Art Company BON · Production</div>
            </div>
          </a>

          <a
            className="present"
            href="https://www.kairosse.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="present__logo present__logo--kairosse">
              <Image src="/images/logo-kairosse.jpg" alt="카이로스 로고" width={240} height={240} />
            </div>
            <div className="present__meta">
              <div className="present__name">(주) 카이로스</div>
              <div className="present__role">Kairosse · Publishing</div>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
