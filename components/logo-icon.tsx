import { cn } from "@/lib/utils";

interface LogoIconProps extends React.SVGProps<SVGSVGElement> {}

export function LogoIcon({ className, ...props }: LogoIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("text-current", className)}
      aria-hidden="true"
      {...props}
    >
      {/* Outer Clipboard Frame */}
      <rect x="4" y="4" width="16" height="18" rx="2" ry="2" />
      
      {/* Clipboard Clip */}
      <path d="M8 4V2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M9 4h6" />

      {/* Internal Bracket Structure (Left Side) */}
      <path d="M8 10h2v4H8" />
      <path d="M10 12h2" />

      {/* Internal Bracket Structure (Right Side) */}
      <path d="M16 10h-2v4h2" />
      <path d="M14 12h-2" />

      {/* Center Final Match indicator */}
      <circle cx="12" cy="12" r="1.5" className="fill-current" />
    </svg>
  );
}
