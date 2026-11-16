"use client";

import { useRef } from "react";
import CinematicMicrobiologyBackground from "./CinematicMicrobiologyBackground";

const NewsComponent = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      className="hide-scrollbar relative h-[calc(100vh-4rem)] w-full overflow-y-auto overflow-x-hidden lg:scroll-smooth"
    >
      <CinematicMicrobiologyBackground scrollContainerRef={scrollRef} />

      {/* Replace this minimum stage with the real lesson content.
          The world grows automatically if the content becomes taller. */}
    </div>
  );
};

export default NewsComponent;
