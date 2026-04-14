const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const supportsViewTransitions = "startViewTransition" in document;

let revealObserver = null;
let revealAnimationsEnabled = false;

document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion = motionQuery.matches;

  initPageTransitions(reduceMotion);
  initScrollReveal(reduceMotion);

  document.querySelectorAll("[data-tabs]").forEach((root) => {
    initTabs(root, reduceMotion);
  });
});

function initPageTransitions(reduceMotion) {
  if (reduceMotion || supportsViewTransitions) {
    return;
  }

  document.querySelectorAll("a[href]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.defaultPrevented) {
        return;
      }

      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      ) {
        return;
      }

      if (link.target && link.target !== "_self") {
        return;
      }

      if (link.hasAttribute("download")) {
        return;
      }

      const href = link.getAttribute("href");

      if (!href || href.startsWith("#")) {
        return;
      }

      const targetUrl = new URL(link.href, window.location.href);
      const currentUrl = new URL(window.location.href);

      if (targetUrl.origin !== currentUrl.origin) {
        return;
      }

      const isSameDocumentHashLink =
        targetUrl.pathname === currentUrl.pathname &&
        targetUrl.search === currentUrl.search &&
        targetUrl.hash;

      if (isSameDocumentHashLink) {
        return;
      }

      event.preventDefault();
      document.body.classList.add("is-leaving");

      window.setTimeout(() => {
        window.location.href = targetUrl.href;
      }, 180);
    });
  });
}

function initScrollReveal(reduceMotion) {
  const targets = getRevealTargets(document);

  if (targets.length === 0) {
    return;
  }

  if (reduceMotion || !("IntersectionObserver" in window)) {
    targets.forEach((element) => {
      element.classList.add("is-revealed");
    });
    return;
  }

  revealAnimationsEnabled = true;
  revealObserver = new IntersectionObserver(handleRevealEntries, {
    threshold: 0.14,
    rootMargin: "0px 0px -8% 0px"
  });

  primeRevealTargets(targets.filter((element) => !element.closest("[hidden]")));
}

function handleRevealEntries(entries) {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) {
      return;
    }

    entry.target.classList.add("is-revealed");
    revealObserver.unobserve(entry.target);
  });
}

function getRevealTargets(root) {
  return Array.from(
    root.querySelectorAll(
      [
        ".home-hero",
        ".tab-grid",
        ".timeline-date",
        ".info-item",
        ".timeline-content",
        ".project-card",
        ".summary-image",
        ".pdf-actions",
        ".project-pager",
        ".project-pager-wrapper"
      ].join(",")
    )
  );
}

function primeRevealTargets(elements) {
  elements.forEach((element, index) => {
    if (element.dataset.revealReady === "true") {
      return;
    }

    element.dataset.revealReady = "true";
    element.classList.add("reveal-init");
    element.style.setProperty("--reveal-delay", `${Math.min(index % 6, 5) * 40}ms`);
    revealObserver.observe(element);
  });
}

function revealWithin(root) {
  const targets = getRevealTargets(root).filter((element) => !element.closest("[hidden]"));

  if (targets.length === 0) {
    return;
  }

  if (!revealAnimationsEnabled || !revealObserver) {
    targets.forEach((element) => {
      element.classList.add("is-revealed");
    });
    return;
  }

  primeRevealTargets(targets);
}

function initTabs(root, reduceMotion) {
  const tablist = root.querySelector('[role="tablist"]');

  if (!tablist) {
    return;
  }

  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));

  if (tabs.length === 0) {
    return;
  }

  const panels = tabs.map((tab) => {
    const panelId = tab.getAttribute("aria-controls");
    return panelId ? document.getElementById(panelId) : null;
  });

  let activeIndex = tabs.findIndex(
    (tab) =>
      tab.getAttribute("aria-selected") === "true" ||
      tab.classList.contains("active")
  );

  if (activeIndex < 0) {
    activeIndex = 0;
  }

  const updateIndicator = () => {
    const activeTab = tabs[activeIndex];

    if (!activeTab) {
      return;
    }

    const activeRect = activeTab.getBoundingClientRect();
    const tablistRect = tablist.getBoundingClientRect();

    tablist.style.setProperty("--indicator-x", `${activeRect.left - tablistRect.left}px`);
    tablist.style.setProperty("--indicator-y", `${activeRect.top - tablistRect.top}px`);
    tablist.style.setProperty("--indicator-w", `${activeRect.width}px`);
    tablist.style.setProperty("--indicator-h", `${activeRect.height}px`);
    tablist.style.setProperty("--indicator-opacity", "1");
  };

  const activateTab = (index, moveFocus = false) => {
    if (index < 0 || index >= tabs.length) {
      return;
    }

    const nextPanel = panels[index];

    tabs.forEach((tab, tabIndex) => {
      const isActive = tabIndex === index;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.setAttribute("tabindex", isActive ? "0" : "-1");
    });

    panels.forEach((panel, panelIndex) => {
      if (!panel) {
        return;
      }

      const isActive = panelIndex === index;
      panel.classList.toggle("active", isActive);
      panel.hidden = !isActive;
    });

    if (nextPanel && !reduceMotion) {
      nextPanel.classList.remove("is-entering");
      void nextPanel.offsetWidth;
      nextPanel.classList.add("is-entering");
      nextPanel.addEventListener(
        "animationend",
        () => {
          nextPanel.classList.remove("is-entering");
        },
        { once: true }
      );
    }

    activeIndex = index;
    revealWithin(nextPanel || root);
    requestAnimationFrame(updateIndicator);

    if (moveFocus) {
      tabs[index].focus();
    }
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      activateTab(index, false);
    });

    tab.addEventListener("keydown", (event) => {
      let nextIndex = null;

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          nextIndex = (index + 1) % tabs.length;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          nextIndex = (index - 1 + tabs.length) % tabs.length;
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = tabs.length - 1;
          break;
        default:
          break;
      }

      if (nextIndex !== null) {
        event.preventDefault();
        activateTab(nextIndex, true);
      }
    });
  });

  window.addEventListener("resize", updateIndicator, { passive: true });

  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(() => {
      updateIndicator();
    });
    resizeObserver.observe(tablist);
  }

  activateTab(activeIndex, false);
}
