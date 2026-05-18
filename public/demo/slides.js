window.addEventListener("DOMContentLoaded", () => {
  const tracker = window.DeckLens.createTracker({
    projectId: "cloudbtl-demo",
    deckId: "decklens-demo-proposal",
    endpoint: "/api/events",
    debug: true
  });

  tracker.start();
});
