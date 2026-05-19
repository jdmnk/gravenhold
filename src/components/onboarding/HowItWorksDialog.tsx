import { useEffect, useRef } from "react";

import { howItWorksSections } from "@/lib/onboarding/howItWorksContent";

type HowItWorksDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function HowItWorksDialog({
  onOpenChange,
  open,
}: HowItWorksDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      aria-modal="true"
      className="how-it-works-backdrop"
      onClick={() => onOpenChange(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") onOpenChange(false);
      }}
      role="dialog"
    >
      <section
        aria-labelledby="how-it-works-title"
        className="how-it-works-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="how-it-works-header">
          <div>
            <h2 id="how-it-works-title">How it works</h2>
            <p>Read the rules once, then make the calls yourself.</p>
          </div>
          <button
            aria-label="Close how it works"
            className="dialog-close"
            onClick={() => onOpenChange(false)}
            ref={closeButtonRef}
            type="button"
          >
            Close
          </button>
        </header>

        <div className="rules-grid">
          {howItWorksSections.map((section) => (
            <article key={section.title}>
              <h3>{section.title}</h3>
              <p>{section.body}</p>
            </article>
          ))}
        </div>

        <footer className="how-it-works-actions">
          <button onClick={() => onOpenChange(false)} type="button">
            Got it
          </button>
        </footer>
      </section>
    </div>
  );
}
