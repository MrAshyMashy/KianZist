"use client";

import { useRef } from "react";
import AboutSeedBackground from "./Aboutseedbackground";

const AboutComponent = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      className="hide-scrollbar relative h-[calc(100vh-4rem)] w-full overflow-y-auto overflow-x-hidden lg:scroll-smooth"
    >
      <AboutSeedBackground scrollContainerRef={scrollRef} />

      {/* Replace this minimum stage with the real lesson content.
          The world grows automatically if the content becomes taller. */}
    </div>
  );
};

export default AboutComponent;
