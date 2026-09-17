import { ArrowRight, Leaf, Search } from "lucide-react";

import { PreviewNotice } from "@/components/shared/preview-notice";

export function PantryTeaser() {
  return (
    <section
      className="pantry-teaser glass"
      id="pantry"
      aria-labelledby="pantry-title"
    >
      <div>
        <p className="eyebrow">Pantry</p>
        <h2 id="pantry-title">What’s in your fridge?</h2>
        <p className="muted-copy">
          Turn your ingredients into something delicious.
        </p>
      </div>
      <div className="pantry-preview">
        <div className="pantry-preview-row">
          <div className="pantry-placeholder glass">
            <Search size={19} aria-hidden="true" />
            <span>A little of this. A little of that.</span>
          </div>
          <PreviewNotice
            className="button-primary"
            title="Good ingredients. Bright ideas."
            description="Pantry will match recipes to your ingredients and explain exactly what's missing. Ingredient selection and matching are not available in this preview."
          >
            Explore Pantry <ArrowRight size={16} aria-hidden="true" />
          </PreviewNotice>
        </div>
        <div
          className="pantry-ingredients"
          aria-label="Example pantry ingredients"
        >
          <span>eggs</span>
          <span>spinach</span>
          <span>tomato</span>
          <span>cheese</span>
          <small>
            <Leaf size={13} aria-hidden="true" />
            Coming soon
          </small>
        </div>
      </div>
    </section>
  );
}
