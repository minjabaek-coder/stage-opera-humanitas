export function Info() {
  return (
    <section className="info" id="info">
      <div className="container">
        <dl className="info__grid">
          <div className="info__item">
            <dt>Venue</dt>
            <dd>
              호서대학교 ART SPACE HOSEO
              <small>서울특별시 서초구 반포대로 9</small>
            </dd>
          </div>
          <div className="info__item">
            <dt>Time</dt>
            <dd>
              토요일 · 15:00–17:00
              <small>Sat · 3 PM — 5 PM</small>
            </dd>
          </div>
          <div className="info__item">
            <dt>Fee</dt>
            <dd>
              회차당 ₩100,000
              <small>Per Session · KRW</small>
            </dd>
          </div>
          <div className="info__item">
            <dt>Seats</dt>
            <dd>
              24석 한정
              <small>By Reservation Only</small>
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
