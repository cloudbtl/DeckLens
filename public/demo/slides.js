window.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("submit", (event) => {
    if (event.target.matches("[data-track]")) event.preventDefault();
  });

  const tracker = window.DeckLens.createTracker({
    projectId: "cloudbtl-demo",
    deckId: "decklens-demo-proposal",
    endpoint: "/api/events",
    visibilityThreshold: 0.3,
    debug: true
  });

  tracker.start();
});
