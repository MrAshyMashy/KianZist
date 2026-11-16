import { LabelHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import Typography from "@/typography";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn("inline-block cursor-pointer", className)}
        {...props}
      >
        <Typography
          variant="label"
          as="span"
          className="font-medium text-kz-text-heading"
        >
          {children}
        </Typography>
      </label>
    );
  },
);
Label.displayName = "Label";
