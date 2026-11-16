"use client";

import { useRef } from "react";
import ContactGrowthBackground from "./ContactGrowthBackground";

const ContactComponent = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      className="hide-scrollbar relative h-[calc(100vh-4rem)] w-full overflow-y-auto overflow-x-hidden lg:scroll-smooth"
    >
      <ContactGrowthBackground scrollContainerRef={scrollRef} />

      {/* Replace this minimum stage with the real lesson content.
          The world grows automatically if the content becomes taller. */}
    </div>
  );
};

export default ContactComponent;
