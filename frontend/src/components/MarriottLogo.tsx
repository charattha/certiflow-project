// The Marriott glyph (same mark as public/marriott-m.svg, used for the favicon) as a
// colorable inline SVG — used on the dark nav band, where a white-on-black wordmark
// image would need a light chip. The login screen sits on a light surface, so it uses
// the real property lockup image (public/marriott-marquis-logo.png, from IMG_5609) directly.
function MarriottGlyph({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor" aria-hidden="true">
      <path d="M8.802 11.083l-1.178 2.41c-.8 1.425-1.931 3.167-3.646 3.603-.668.232-1.255.023-1.9-.023L0 20.476a1.626 1.626 0 0 0 .59.386c3.647 1.39 5.122-.1 8.722-8.238l3.403 7.249h4.53l-2.14-4.893 1.213-2.53 3.345 7.311 4.337.027-7.59-16.677-3.475 1.738 2.738 6.222-1.201 2.445L9.45 2.678l-3.7 1.877Z" />
    </svg>
  );
}

/**
 * variant "lockup"  — the real Marriott Marquis Bangkok Queen's Park lockup image, for the login screen.
 * variant "compact" — the recolorable glyph + CertiFlow wordmark, for the dark nav band.
 */
export function MarriottLogo({
  variant = "lockup",
  theme = "light",
}: {
  variant?: "lockup" | "compact";
  theme?: "light" | "dark";
}) {
  if (variant === "compact") {
    const markColor = theme === "dark" ? "text-red-bright" : "text-red";
    const ink = theme === "dark" ? "text-sheet" : "text-ink";
    return (
      <div className="flex items-center gap-2.5">
        <MarriottGlyph className={`h-6 w-6 ${markColor} flex-shrink-0`} />
        <span className={`font-data text-[0.95rem] font-bold tracking-tight ${ink}`}>CertiFlow</span>
      </div>
    );
  }

  return (
    <img
      src="/marriott-marquis-logo.png"
      alt="Marriott Marquis Bangkok Queen's Park"
      className="h-24 w-auto mx-auto"
    />
  );
}
