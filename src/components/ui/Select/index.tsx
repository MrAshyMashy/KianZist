"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import Typography from "@/typography";
import { GlassBase } from "@/components/ui/GlassBase";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const Select = ({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className,
}: SelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(value || "");
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
    }
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !target.closest(".kz-select-dropdown")
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (value !== undefined) setSelected(value);
  }, [value]);

  const handleSelect = (val: string) => {
    setSelected(val);
    onChange?.(val);
    setIsOpen(false);
  };

  const selectedLabel = options.find((opt) => opt.value === selected)?.label;

  return (
    <>
      <div className={cn("relative w-full", className)} ref={containerRef}>
        <GlassBase
          as="button"
          ref={buttonRef}
          type="button"
          variant="medium"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-full px-5 py-2.5 text-sm text-kz-text-heading transition-colors focus:outline-none focus:ring-2 focus:ring-kz-brand-accent/50"
        >
          <Typography
            variant="label"
            className="truncate pr-2 font-medium rtl:pr-0 rtl:pl-2"
          >
            {selectedLabel || placeholder}
          </Typography>
          <ChevronDown
            size={16}
            className={cn(
              "text-kz-text-muted transition-transform duration-300",
              isOpen && "rotate-180",
            )}
          />
        </GlassBase>
      </div>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <GlassBase
                as={motion.div}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                variant="heavy"
                className="kz-select-dropdown fixed overflow-hidden rounded-2xl"
                style={{
                  top: coords.top,
                  left: coords.left,
                  width: coords.width,
                  zIndex: 999999,
                }}
              >
                <ul className="max-h-60 overflow-y-auto p-1.5 focus:outline-none">
                  {options.map((option) => {
                    const isSelected = selected === option.value;
                    return (
                      <li key={option.value}>
                        <button
                          type="button"
                          onClick={() => handleSelect(option.value)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm transition-colors",
                            isSelected
                              ? "bg-kz-brand-primary/10 text-kz-brand-primary font-semibold"
                              : "text-kz-text-heading hover:bg-kz-button-ghostHover",
                          )}
                        >
                          <Typography
                            variant="label"
                            className={
                              isSelected ? "text-kz-brand-primary" : ""
                            }
                          >
                            {option.label}
                          </Typography>
                          {isSelected && <Check size={16} />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </GlassBase>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
};
