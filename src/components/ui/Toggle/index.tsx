import { cn } from "@/lib/utils";
import { GlassBase } from "@/components/ui/GlassBase";

interface ToggleOption {
  label: string;
  value: string;
}

interface ToggleProps {
  options: ToggleOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const Toggle = ({
  options,
  value,
  onChange,
  className,
}: ToggleProps) => {
  return (
    <GlassBase
      variant="light"
      className={cn("flex items-center p-1 rounded-full", className)}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-bold transition-all duration-300",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kz-brand-accent/60",
              active
                ? "bg-kz-brand-primary text-kz-brand-text shadow-kz-glow"
                : "text-kz-text-body dark:text-kz-text-heading/85 hover:text-kz-text-heading dark:hover:text-white",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </GlassBase>
  );
};
