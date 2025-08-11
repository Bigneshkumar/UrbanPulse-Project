import React from "react";
import TiltCard from "./TiltCard";
import logo from "@/assets/logo-badge.png";

const FixedLogoBadge: React.FC = () => {
  return (
    <aside
      aria-label="Site logo"
      className="fixed top-3 right-3 z-50"
    >
      <TiltCard
        intensity={0.5}
        className="p-2 border-0 shadow-lg bg-gradient-to-br from-primary/90 via-accent/80 to-secondary/90"
      >
        <img
          src={logo}
          alt="City Services logo"
          loading="lazy"
          className="h-10 w-10 md:h-12 md:w-12 drop-shadow"
        />
      </TiltCard>
    </aside>
  );
};

export default FixedLogoBadge;
