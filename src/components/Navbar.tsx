import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
const logo = "/UrbanPulse-uploads/d392b21f-feda-418c-a860-fa9a9e426889.png";

const Navbar = () => {
  const { i18n, t } = useTranslation();
  const location = useLocation();

  return (
    <header className="w-full sticky top-0 z-20 bg-background/70 backdrop-blur border-b">
      <nav className="container mx-auto flex items-center justify-between py-3">
        <Link to="/" className="font-semibold text-lg hover-scale flex items-center gap-2">
          <img src={logo} alt="UrbanPulse logo" className="h-8 w-8" />
          {t("brand")}
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Globe className="size-4 opacity-80" aria-hidden />
            <Select value={i18n.language} onValueChange={(v) => i18n.changeLanguage(v)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder={t("lang")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">à¤¹à¤¿à¤¨à¥à¤¦à¥€</SelectItem>
                <SelectItem value="bn">à¦¬à¦¾à¦‚à¦²à¦¾</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" asChild>
            <Link to="/contact">Contact</Link>
          </Button>
          {location.pathname !== "/login" && (
            <Button asChild>
              <Link to="/login">{t("cta_login")}</Link>
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;

