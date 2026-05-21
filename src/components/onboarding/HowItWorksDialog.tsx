import { useEffect, useRef, useState } from "react";

import { howItWorksScreens } from "@/lib/onboarding/howItWorksContent";

type HowItWorksDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function HowItWorksDialog({
  onOpenChange,
  open,
}: HowItWorksDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [activeScreen, setActiveScreen] = useState(0);
  const screen = howItWorksScreens[activeScreen];
  const canGoBack = activeScreen > 0;
  const canGoNext = activeScreen < howItWorksScreens.length - 1;

  useEffect(() => {
    if (!open) return;
    setActiveScreen(0);
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
        if (event.key === "ArrowLeft" && canGoBack) {
          setActiveScreen((current) => current - 1);
        }
        if (event.key === "ArrowRight" && canGoNext) {
          setActiveScreen((current) => current + 1);
        }
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
            <p>Three quick screens before the first choice.</p>
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

        <article className="how-it-works-screen">
          <div className="screen-index" aria-hidden="true">
            {activeScreen + 1}/{howItWorksScreens.length}
          </div>
          <h3>{screen.title}</h3>
          <p>{screen.detail}</p>
          <ul>
            {screen.cues.map((cue) => (
              <li key={cue}>{cue}</li>
            ))}
          </ul>
        </article>

        <nav className="screen-dots" aria-label="How it works screens">
          {howItWorksScreens.map((item, index) => (
            <button
              aria-label={`Show screen ${index + 1}: ${item.title}`}
              aria-current={index === activeScreen ? "step" : undefined}
              className={index === activeScreen ? "is-active" : ""}
              key={item.title}
              onClick={() => setActiveScreen(index)}
              type="button"
            />
          ))}
        </nav>

        <footer className="how-it-works-actions">
          <button
            disabled={!canGoBack}
            onClick={() => setActiveScreen((current) => current - 1)}
            type="button"
          >
            Back
          </button>
          <button
            onClick={() => {
              if (canGoNext) {
                setActiveScreen((current) => current + 1);
                return;
              }
              onOpenChange(false);
            }}
            type="button"
          >
            {canGoNext ? "Next" : "Start"}
          </button>
        </footer>
      </section>
    </div>
  );
}
