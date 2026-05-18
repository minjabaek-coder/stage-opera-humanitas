import { Audience } from "@/components/landing/Audience";
import { Books } from "@/components/landing/Books";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { Info } from "@/components/landing/Info";
import { IntroOverlay } from "@/components/landing/IntroOverlay";
import { Philosophy } from "@/components/landing/Philosophy";
import { RevealObserver } from "@/components/landing/RevealObserver";
import { Series } from "@/components/landing/Series";
import { Speaker } from "@/components/landing/Speaker";
import { getProgramAvailability } from "@/data/programs";

// 좌석 현황이 빌드 시점에 박제되지 않도록 30초 ISR.
// 거의 정적인 페이지지만 회차 카드의 잔여 좌석은 라이브로 반영되어야 한다.
export const revalidate = 30;

export default async function Home() {
  const availability = await getProgramAvailability();
  return (
    <>
      <IntroOverlay />
      <RevealObserver />
      <Hero />
      <Philosophy />
      <Speaker />
      <Series availability={availability} />
      <Books />
      <Info />
      <Audience />
      <CTA />
      <Footer />
    </>
  );
}
