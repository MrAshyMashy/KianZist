"use client";

import { InputHTMLAttributes, forwardRef } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassBase } from "@/components/ui/GlassBase";
import { Input } from "@/components/ui/Input";

export interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <GlassBase
        variant="medium"
        className={cn("relative w-full rounded-full", className)}
      >
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-kz-text-muted rtl:left-auto rtl:right-4"
        />
        <Input
          ref={ref}
          type="search"
          className={cn(
            "w-full rounded-full border-none bg-transparent py-2.5 pl-11 pr-4 shadow-none backdrop-blur-none",
            "rtl:pl-4 rtl:pr-11",
          )}
          {...props}
        />
      </GlassBase>
    );
  },
);
SearchInput.displayName = "SearchInput";
