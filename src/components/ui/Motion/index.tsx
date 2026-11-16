"use client";

import { ReactNode, RefObject, useSyncExternalStore } from "react";
import { motion, useScroll, useTransform, MotionProps } from "framer-motion";
import { usePathname } from "next/navigation";

/* =========================================================
   ANIMATION VARIANTS
========================================================= */
export const fadeUpVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  },
};

export const scaleBlurVariants = {
  hidden: { opacity: 0, scale: 0.9, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 1, ease: [0.16, 1, 0.3, 1] },
  },
};

export const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8 } },
};

/* =========================================================
   HOOK: DETECT DESKTOP
========================================================= */
const subscribe = (callback: () => void) => {
  const mq = window.matchMedia("(min-width: 1024px)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
};

const getSnapshot = () => window.matchMedia("(min-width: 1024px)").matches;
const getServerSnapshot = () => false; // Default to false for SSR

const useIsDesktop = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

/* =========================================================
   1. MOTION CONTAINER (Parent Wrapper for Stagger)
========================================================= */
interface MotionContainerProps extends MotionProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}

export const MotionContainer = ({
  children,
  className,
  stagger = 0.15,
  delay = 0.2,
  ...props
}: MotionContainerProps) => {
  const isDesktop = useIsDesktop();
  const pathname = usePathname();

  // Only animate if it's the Home page AND it's Desktop
  const shouldAnimate = isDesktop && pathname === "/";

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: stagger, delayChildren: delay },
    },
  };

  return (
    <motion.div
      initial={shouldAnimate ? "hidden" : false}
      whileInView={shouldAnimate ? "visible" : undefined}
      viewport={{ once: false, amount: 0.2 }}
      variants={shouldAnimate ? containerVariants : undefined}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/* =========================================================
   2. MOTION ITEM (Child Element)
========================================================= */
type MotionVariantType = "fadeUp" | "scaleBlur" | "fadeIn";

interface MotionItemProps extends MotionProps {
  children: ReactNode;
  className?: string;
  variant?: MotionVariantType;
}

export const MotionItem = ({
  children,
  className,
  variant = "fadeUp",
  ...props
}: MotionItemProps) => {
  const isDesktop = useIsDesktop();
  const pathname = usePathname();

  // Only animate if it's the Home page AND it's Desktop
  const shouldAnimate = isDesktop && pathname === "/";

  const variantMap = {
    fadeUp: fadeUpVariants,
    scaleBlur: scaleBlurVariants,
    fadeIn: fadeInVariants,
  };

  return (
    <motion.div
      variants={shouldAnimate ? variantMap[variant] : undefined}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/* =========================================================
   3. MOTION PARALLAX (Scroll-Linked Transform)
========================================================= */
interface MotionParallaxProps extends MotionProps {
  children: ReactNode;
  className?: string;
  targetRef?: RefObject<HTMLElement | null>;
  opacityRange?: [number, number];
  scaleRange?: [number, number];
  yRange?: [number, number];
}

export const MotionParallax = ({
  children,
  className,
  targetRef,
  opacityRange = [1, 0],
  scaleRange = [1, 0.9],
  yRange = [0, 100],
  ...props
}: MotionParallaxProps) => {
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.8], opacityRange);
  const scale = useTransform(scrollYProgress, [0, 1], scaleRange);
  const y = useTransform(scrollYProgress, [0, 1], yRange);

  return (
    <motion.div style={{ opacity, scale, y }} className={className} {...props}>
      {children}
    </motion.div>
  );
};

/* =========================================================
   4. MOTION DRAW PATH (For SVG Animations)
========================================================= */
interface MotionDrawPathProps extends MotionProps {
  d: string;
  className?: string;
  strokeWidth?: number;
  delay?: number;
}

export const MotionDrawPath = ({
  d,
  className,
  strokeWidth = 2,
  delay = 0.5,
  ...props
}: MotionDrawPathProps) => {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      className={className}
      initial={{ pathLength: 0 }}
      whileInView={{ pathLength: 1 }}
      viewport={{ once: false }}
      transition={{ duration: 1.5, delay, ease: "easeOut" }}
      {...props}
    />
  );
};
