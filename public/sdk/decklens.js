(function () {
  const DEFAULT_ENDPOINT = "/api/events";
  const DEFAULT_FLUSH_INTERVAL = 5000;

  function now() {
    return Date.now();
  }

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return `pv_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }

  function getOrCreateSessionId(projectId) {
    const key = `decklens:${projectId}:session`;
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const created = uuid();
    sessionStorage.setItem(key, created);
    return created;
  }

  function createTracker(options) {
    const config = {
      projectId: "demo",
      deckId: document.title || "untitled-deck",
      endpoint: DEFAULT_ENDPOINT,
      flushInterval: DEFAULT_FLUSH_INTERVAL,
      debug: false,
      ...options
    };

    const sessionId = getOrCreateSessionId(config.projectId);
    const userId = localStorage.getItem(`decklens:${config.projectId}:user`) || uuid();
    localStorage.setItem(`decklens:${config.projectId}:user`, userId);

    let queue = [];
    let currentSlide = null;
    let currentSlideStartedAt = now();
    let sequence = 0;

    function baseEvent(type, data) {
      return {
        type,
        projectId: config.projectId,
        deckId: config.deckId,
        sessionId,
        userId,
        sequence: ++sequence,
        pageUrl: location.href,
        userAgent: navigator.userAgent,
        occurredAt: new Date().toISOString(),
        ...data
      };
    }

    function enqueue(type, data) {
      const event = baseEvent(type, data);
      queue.push(event);
      if (config.debug) console.log("[decklens]", event);
      return event;
    }

    function flush(useBeacon) {
      if (!queue.length) return;
      const payload = JSON.stringify({ events: queue.splice(0, queue.length) });

      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(config.endpoint, new Blob([payload], { type: "application/json" }));
        return;
      }

      fetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true
      }).catch(() => {
        try {
          const failed = JSON.parse(payload).events;
          queue = failed.concat(queue).slice(-200);
        } catch {
          // Ignore malformed retry payloads.
        }
      });
    }

    function closeSlide(nextSlideId) {
      if (!currentSlide) return;
      enqueue("slide_view", {
        slideId: currentSlide,
        durationMs: now() - currentSlideStartedAt,
        nextSlideId
      });
    }

    function viewSlide(slideId) {
      if (!slideId || slideId === currentSlide) return;
      closeSlide(slideId);
      currentSlide = slideId;
      currentSlideStartedAt = now();
      enqueue("slide_enter", { slideId });
    }

    function trackInteraction(element, eventType) {
      const targetId = element.id || null;
      const targetName =
        element.getAttribute("data-track-name") ||
        element.getAttribute("aria-label") ||
        element.textContent.trim().slice(0, 80) ||
        targetId ||
        element.tagName.toLowerCase();

      enqueue("interaction", {
        slideId: currentSlide,
        targetId,
        targetName,
        eventType,
        href: element.href || null
      });
    }

    function observeSlides() {
      const slides = Array.from(document.querySelectorAll("[data-slide-id]"));
      if (!slides.length) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
          if (visible) viewSlide(visible.target.getAttribute("data-slide-id"));
        },
        { threshold: [0.6] }
      );

      slides.forEach((slide) => observer.observe(slide));
      const firstVisible = slides.find((slide) => slide.getBoundingClientRect().top >= 0) || slides[0];
      viewSlide(firstVisible.getAttribute("data-slide-id"));
    }

    function bindInteractions() {
      document.addEventListener("click", (event) => {
        const tracked = event.target.closest("[data-track]");
        if (tracked) trackInteraction(tracked, "click");
      });

      document.addEventListener("input", (event) => {
        const tracked = event.target.closest("[data-track]");
        if (tracked) trackInteraction(tracked, "input");
      });
    }

    function start() {
      enqueue("session_start", {
        viewport: { width: window.innerWidth, height: window.innerHeight }
      });
      observeSlides();
      bindInteractions();
      setInterval(() => flush(false), config.flushInterval);
      window.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          closeSlide(null);
          flush(true);
        } else if (currentSlide) {
          currentSlideStartedAt = now();
        }
      });
      window.addEventListener("beforeunload", () => {
        closeSlide(null);
        enqueue("session_end", {});
        flush(true);
      });
    }

    return { start, track: enqueue, viewSlide, flush };
  }

  const api = { createTracker };

  window.DeckLens = api;
  window.DeckLensAnalytics = api;
})();
