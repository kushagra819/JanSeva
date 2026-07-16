import { AppShell } from "../components/layout/app-shell";
import { LandingCta } from "../components/marketing/landing-cta";
import { LandingFeatureGrid } from "../components/marketing/landing-feature-grid";
import { LandingHero } from "../components/marketing/landing-hero";
import { LandingProcess } from "../components/marketing/landing-process";
import { LandingStatGrid } from "../components/marketing/landing-stat-grid";
import { LandingTransparency } from "../components/marketing/landing-transparency";

export const Landing = () => {
  return (
    <AppShell>
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <LandingHero />
        <LandingStatGrid />
        <LandingProcess />
        <LandingFeatureGrid />
        <LandingTransparency />
        <LandingCta />
      </main>
    </AppShell>
  );
};
