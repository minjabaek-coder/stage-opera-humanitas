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
