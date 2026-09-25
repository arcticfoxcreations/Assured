import { forwardRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "emergency" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-soft hover:shadow-soft-hover hover:-translate-y-0.5 active:translate-y-0 active:opacity-90",
  secondary:
    "bg-surface-2 text-foreground border border-border hover:bg-surface-2/70 hover:-translate-y-0.5 active:translate-y-0",
  emergency:
    "bg-emergency text-emergency-foreground shadow-glow hover:opacity-95 hover:-translate-y-0.5 active:translate-y-0",
  ghost: "text-foreground hover:bg-surface-2",
  outline:
    "border border-border text-foreground hover:bg-surface-2 hover:-translate-y-0.5 active:translate-y-0",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-lg",
  md: "h-11 px-4 text-sm rounded-xl min-w-[44px]",
  lg: "h-14 px-6 text-base rounded-2xl min-w-[44px]",
};

interface BaseProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

type ButtonAsButton = BaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type ButtonAsLink = BaseProps & { href: string } & Omit<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    "href"
  >;

type ButtonProps = ButtonAsButton | ButtonAsLink;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", className, children, ...props },
    ref
  ) {
    const classes = cn(
      "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 ease-calm",
      "disabled:opacity-50 disabled:pointer-events-none disabled:translate-y-0 disabled:shadow-none",
      variantClasses[variant],
      sizeClasses[size],
      className
    );

    if ("href" in props && props.href) {
      const { href, ...rest } = props as ButtonAsLink;
      return (
        <Link href={href} className={classes} {...rest}>
          {children}
        </Link>
      );
    }

    return (
      <button ref={ref} className={classes} {...(props as ButtonAsButton)}>
        {children}
      </button>
    );
  }
);
