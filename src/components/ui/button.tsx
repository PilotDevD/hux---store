"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "light";

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "btn",
        variant === "primary" && "btn-primary",
        variant === "ghost" && "btn-ghost",
        variant === "light" && "btn-light",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Submit button that reflects a server action's pending state. */
export function SubmitButton({
  variant = "primary",
  className,
  children,
  pendingLabel,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || props.disabled}
      className={cn(
        "btn",
        variant === "primary" && "btn-primary",
        variant === "ghost" && "btn-ghost",
        variant === "light" && "btn-light",
        className,
      )}
      {...props}
    >
      {pending && <Loader2 size={16} className="animate-spin" />}
      {pending ? pendingLabel ?? children : children}
    </button>
  );
}
