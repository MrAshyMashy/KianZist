"use client";

import { Search, ArrowRight } from "lucide-react";
import Typography from "@/typography";
import { Magnetic } from "@/components/ui/Fx";
import { cn } from "@/lib/utils";

interface SearchHeroWidgetProps {
  placeholder?: string;
  tags?: string[];
  className?: string;
  onSearch?: (value: string) => void;
  lang?: "fa" | "en"; // Added lang prop
}

export const SearchHeroWidget = ({
  placeholder = "جستجوی مقاله، نویسنده یا موضوع...",
  tags = ["میکروبیولوژی", "شوری خاک", "PGPR", "کودآبیاری"],
  className,
  onSearch,
  lang = "fa", // Default to fa
}: SearchHeroWidgetProps) => {
  const isRTL = lang === "fa";

  return (
    <div
      className={cn(
        "flex w-full max-w-3xl flex-col items-center gap-6",
        className,
      )}
    >
      {/* Search Bar Wrapper */}
      <div className="relative w-full group">
        <form
          onSubmit={(e: any) => {
            e.preventDefault();
            if (onSearch) onSearch(e.target.search.value);
          }}
          className={cn(
            "relative z-10 flex w-full items-center gap-2 overflow-hidden rounded-full p-2 transition-all duration-300",
            // TiltCard glass styling
            "border border-kz-border-main/50 bg-kz-bg-surface/30 backdrop-blur-2xl shadow-kz-card",
            "hover:bg-kz-bg-surface/40 focus-within:bg-kz-bg-surface/40 focus-within:shadow-kz-glow-accent",
          )}
        >
          {/* Left Icon (Search) */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center">
            <Search
              size={20}
              className="text-kz-text-muted transition-colors duration-300 group-focus-within:text-kz-brand-accent"
            />
          </div>

          {/* Input field */}
          <input
            type="text"
            name="search"
            placeholder={placeholder}
            className="w-full flex-1 bg-transparent text-sm font-medium text-kz-text-heading outline-none border-none ring-0 focus:outline-none focus:ring-0 placeholder:text-kz-text-muted/60 placeholder:font-normal md:text-base"
          />

          {/* Right Action Button (Submit Arrow) */}
          <Magnetic strength={0.15}>
            <button
              type="submit"
              aria-label="Search"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-kz-brand-accent/10 text-kz-brand-accent transition-all duration-300 hover:bg-kz-brand-accent hover:text-white hover:shadow-kz-glow-accent"
            >
              <ArrowRight size={18} className="rtl:-scale-x-100" />
            </button>
          </Magnetic>
        </form>

        {/* Gradient Border Overlay (Fixed to rounded-full) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 rounded-full bg-kz-brand-gradient opacity-[0.14] dark:opacity-[0.22] transition-opacity duration-300 group-hover:opacity-30 group-focus-within:opacity-40"
          style={{
            padding: 1,
            WebkitMask:
              "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        />
      </div>

      {/* Suggested Tags */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Typography
          variant="tiny"
          className={cn("text-kz-text-muted", isRTL ? "mr-2" : "ml-2")}
        >
          {isRTL ? "جستجوهای پرطرفدار:" : "Popular searches:"}
        </Typography>
        {tags.map((tag, i) => (
          <Magnetic key={i} strength={0.2}>
            <button
              type="button"
              className="rounded-full border border-kz-border-subtle bg-kz-bg-surface/50 px-3 py-1 text-[11px] font-medium text-kz-text-body backdrop-blur-md transition-colors hover:border-kz-brand-accent/40 hover:bg-kz-brand-accent/10 hover:text-kz-brand-accent md:text-xs"
            >
              {tag}
            </button>
          </Magnetic>
        ))}
      </div>
    </div>
  );
};
