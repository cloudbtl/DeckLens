(function () {
  const DEFAULT_ENDPOINT = "/api/events";
  const DEFAULT_FLUSH_INTERVAL = 5000;
  const ACTION_SELECTOR = [
    "a",
    "button",
    "input",
    "textarea",
    "select",
    "summary",
    "[role='button']",
    "[role='link']",
    "[onclick]",
    "[tabindex]",
    "[contenteditable='true']",
    "[data-track]"
  ].join(",");

  function now() {
    return Date.now();
  }

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return `dl_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }

  function safeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
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
      sectionSelector: "[data-decklens-section], [data-slide-id], section, article",
      actionSelector: ACTION_SELECTOR,
      visibilityThreshold: 0.25,
      debug: false,
      ...options
    };

    const sessionId = getOrCreateSessionId(config.projectId);
    const userId = localStorage.getItem(`decklens:${config.projectId}:user`) || uuid();
    localStorage.setItem(`decklens:${config.projectId}:user`, userId);

    const sectionMeta = new WeakMap();
    const visibleSections = new Map();
    const hoverStarts = new WeakMap();
    const hoverCooldowns = new WeakMap();
    let queue = [];
    let sequence = 0;
    let started = false;

    function pageInfo() {
      return {
        pageUrl: location.href,
        pagePath: `${location.pathname}${location.search}${location.hash}`,
        pageTitle: document.title || ""
      };
    }

    function baseEvent(type, data) {
      return {
        type,
        projectId: config.projectId,
        deckId: config.deckId,
        sessionId,
        userId,
        sequence: ++sequence,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        userAgent: navigator.userAgent,
        occurredAt: new Date().toISOString(),
        ...pageInfo(),
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
          queue = failed.concat(queue).slice(-500);
        } catch {
          // Ignore malformed retry payloads.
        }
      });
    }

    function sectionTitle(element) {
      const explicit =
        element.getAttribute("data-section-title") ||
        element.getAttribute("aria-label") ||
        element.getAttribute("data-track-name");
      if (explicit) return safeText(explicit).slice(0, 120);

      const heading = element.querySelector("h1, h2, h3, [data-section-heading]");
      return safeText(heading ? heading.textContent : element.textContent).slice(0, 120) || "Untitled section";
    }

    function getSectionMeta(element) {
      if (sectionMeta.has(element)) return sectionMeta.get(element);
      const sections = Array.from(document.querySelectorAll(config.sectionSelector));
      const index = Math.max(0, sections.indexOf(element));
      const id =
        element.getAttribute("data-decklens-section") ||
        element.getAttribute("data-slide-id") ||
        element.id ||
        `section-${index + 1}`;
      const meta = {
        sectionId: id,
        sectionTitle: sectionTitle(element),
        sectionIndex: index + 1
      };
      sectionMeta.set(element, meta);
      return meta;
    }

    function currentSectionFor(element) {
      const section = element.closest(config.sectionSelector);
      return section ? getSectionMeta(section) : null;
    }

    function targetMeta(element) {
      const section = currentSectionFor(element);
      const name =
        element.getAttribute("data-track-name") ||
        element.getAttribute("aria-label") ||
        element.getAttribute("name") ||
        safeText(element.textContent).slice(0, 80) ||
        element.id ||
        element.tagName.toLowerCase();

      return {
        targetId: element.id || null,
        targetName: safeText(name).slice(0, 120),
        targetTag: element.tagName.toLowerCase(),
        targetType: element.getAttribute("type") || element.getAttribute("role") || null,
        href: element.href || null,
        sectionId: section ? section.sectionId : null,
        sectionTitle: section ? section.sectionTitle : null,
        sectionIndex: section ? section.sectionIndex : null
      };
    }

    function closeSection(element, nextSectionId) {
      const active = visibleSections.get(element);
      if (!active) return;

      const durationMs = now() - active.startedAt;
      visibleSections.delete(element);
      if (durationMs < 100) return;

      enqueue("section_view", {
        ...active.meta,
        durationMs,
        maxRatio: Number(active.maxRatio.toFixed(3)),
        nextSectionId: nextSectionId || null
      });
    }

    function openSection(element, ratio) {
      if (visibleSections.has(element)) {
        const active = visibleSections.get(element);
        active.maxRatio = Math.max(active.maxRatio, ratio);
        return;
      }

      const meta = getSectionMeta(element);
      visibleSections.set(element, {
        meta,
        startedAt: now(),
        maxRatio: ratio
      });
      enqueue("section_enter", {
        ...meta,
        ratio: Number(ratio.toFixed(3))
      });
    }

    function closeAllSections(nextSectionId) {
      Array.from(visibleSections.keys()).forEach((element) => closeSection(element, nextSectionId));
    }

    function observeSections() {
      const sections = Array.from(document.querySelectorAll(config.sectionSelector));
      if (!sections.length) {
        document.body.setAttribute("data-decklens-section", "document");
        sections.push(document.body);
      }

      const thresholds = [0, config.visibilityThreshold, 0.5, 0.75, 1];
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= config.visibilityThreshold) {
              openSection(entry.target, entry.intersectionRatio);
            } else {
              closeSection(entry.target);
            }
          });
        },
        { threshold: thresholds }
      );

      sections.forEach((section) => observer.observe(section));
      scanVisibleSections(sections);
    }

    function scanVisibleSections(sections) {
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
        const ratio = rect.height > 0 ? Math.max(0, Math.min(1, visibleHeight / rect.height)) : 0;
        if (ratio >= config.visibilityThreshold) openSection(section, ratio);
      });
    }

    function trackAction(element, actionType, extra) {
      enqueue("action", {
        actionType,
        ...targetMeta(element),
        ...extra
      });
    }

    function bindActions() {
      document.addEventListener("click", (event) => {
        const target = event.target.closest(config.actionSelector);
        if (target) trackAction(target, "click", { x: event.clientX, y: event.clientY });
      });

      document.addEventListener(
        "pointerenter",
        (event) => {
          const target = event.target.closest(config.actionSelector);
          if (target) hoverStarts.set(target, now());
        },
        true
      );

      document.addEventListener(
        "pointerleave",
        (event) => {
          const target = event.target.closest(config.actionSelector);
          if (!target || !hoverStarts.has(target)) return;

          const durationMs = now() - hoverStarts.get(target);
          hoverStarts.delete(target);
          const lastTrackedAt = hoverCooldowns.get(target) || 0;
          if (durationMs >= 250 && now() - lastTrackedAt > 1000) {
            hoverCooldowns.set(target, now());
            trackAction(target, "hover", { durationMs });
          }
        },
        true
      );

      document.addEventListener("focusin", (event) => {
        const target = event.target.closest(config.actionSelector);
        if (target) trackAction(target, "focus", {});
      });

      document.addEventListener("input", (event) => {
        const target = event.target.closest(config.actionSelector);
        if (!target) return;
        trackAction(target, "input", {
          valueLength: typeof target.value === "string" ? target.value.length : null
        });
      });

      document.addEventListener("submit", (event) => {
        trackAction(event.target, "submit", {});
      });
    }

    function start() {
      if (started) return;
      started = true;
      enqueue("session_start", {
        referrer: document.referrer || null,
        documentHeight: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
      });
      const sections = Array.from(document.querySelectorAll(config.sectionSelector));
      observeSections();
      bindActions();
      setInterval(() => flush(false), config.flushInterval);

      window.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          closeAllSections(null);
          flush(true);
        } else {
          scanVisibleSections(sections.length ? sections : [document.body]);
        }
      });

      window.addEventListener("beforeunload", () => {
        closeAllSections(null);
        enqueue("session_end", {});
        flush(true);
      });
    }

    return {
      start,
      track: enqueue,
      flush,
      closeAllSections
    };
  }

  const api = { createTracker };

  window.DeckLens = api;
  window.DeckLensAnalytics = api;
})();
