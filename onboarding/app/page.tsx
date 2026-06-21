import { SiteHeader } from "@/components/site-header"
import { Hero } from "@/components/hero"
import { FitsSection } from "@/components/fits-section"
import { Features } from "@/components/features"
import { HowItWorks } from "@/components/how-it-works"
import { SafetySection } from "@/components/safety-section"
import { FinalCta, SiteFooter } from "@/components/cta-footer"
import GradualBlur from "@/components/GradualBlur"

export default function Page() {
  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <main>
        <Hero />
        <FitsSection />
        <Features />
        <HowItWorks />
        <SafetySection />
        <FinalCta />
      </main>
      <SiteFooter />

      {/* progressive blur pinned to the bottom of the viewport — content softly
          blurs as it scrolls down past the edge */}
      <GradualBlur
        target="page"
        position="bottom"
        height="7rem"
        strength={2.5}
        divCount={8}
        curve="bezier"
        exponential
      />
    </div>
  )
}
