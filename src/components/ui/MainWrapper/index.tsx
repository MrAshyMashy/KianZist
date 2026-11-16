import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface MainWrapperProps extends HTMLAttributes<HTMLDivElement> {}

export const MainWrapper = forwardRef<HTMLDivElement, MainWrapperProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative z-10 mx-auto w-full max-w-[1440px] px-6 sm:px-10 md:px-16 lg:px-24 xl:px-32",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
MainWrapper.displayName = "MainWrapper";
