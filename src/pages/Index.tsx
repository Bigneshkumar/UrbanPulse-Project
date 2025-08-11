import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import TiltCard from "@/components/TiltCard";
import ThreeBackground from "@/components/ThreeBackground";
import { useTranslation } from "react-i18next";

const Index = () => {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = "UrbanPulse – Civic Management Platform";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Unified civic services with 3D experience: analytics, reporting, and dashboards.");
  }, []);

  return (
    <main className="min-h-[calc(100vh-4rem)] relative overflow-hidden">
      <ThreeBackground />
      <section className="container mx-auto pt-20 pb-24 text-center animate-enter">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
          UrbanPulse: {t("hero_title")}
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          {t("hero_subtitle")}
        </p>
        <div className="flex justify-center gap-4">
          <Button asChild>
            <Link to="/login">{t("get_started")}</Link>
          </Button>
          <a href="#features" className="story-link text-primary">Learn more</a>
        </div>
      </section>

      <section id="features" className="container mx-auto grid md:grid-cols-3 gap-6 pb-20">
        <TiltCard>
          <h3 className="text-xl font-semibold mb-2">{t("feature_cards.analytics.title")}</h3>
          <p className="text-muted-foreground">{t("feature_cards.analytics.desc")}</p>
        </TiltCard>
        <TiltCard>
          <h3 className="text-xl font-semibold mb-2">{t("feature_cards.reports.title")}</h3>
          <p className="text-muted-foreground">{t("feature_cards.reports.desc")}</p>
        </TiltCard>
        <TiltCard>
          <h3 className="text-xl font-semibold mb-2">{t("feature_cards.dashboard.title")}</h3>
          <p className="text-muted-foreground">{t("feature_cards.dashboard.desc")}</p>
        </TiltCard>
      </section>
    </main>
  );
};

export default Index;
