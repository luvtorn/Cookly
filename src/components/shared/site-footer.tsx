import { Heart } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>Better meals. A brighter you.</span>
      <Heart size={13} aria-hidden="true" />
      <span>Cookly</span>
      <span className="demo-label">
        Design preview · Sample content & imagery
      </span>
    </footer>
  );
}
