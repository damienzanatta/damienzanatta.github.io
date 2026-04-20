const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const supportsViewTransitions = "startViewTransition" in document;
const TRANSITION_EXIT_DURATION = 180;

document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion = motionQuery.matches;

  initHeaderState();
  initPageTransitions(reduceMotion);

  document.querySelectorAll("[data-tabs]").forEach((root) => {
    initTabs(root, reduceMotion);
  });

  animateVisibleElements(document, { reduceMotion });
});

function initHeaderState() {
  const header = document.querySelector(".site-header");

  if (!header) {
    return;
  }

  const syncHeaderState = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 10);
  };

  syncHeaderState();
  window.addEventListener("scroll", syncHeaderState, { passive: true });
}

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
      }, TRANSITION_EXIT_DURATION);
    });
  });
}

function getAnimatedTargets(root) {
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

function animateVisibleElements(
  root,
  { restart = false, reduceMotion = motionQuery.matches } = {}
) {
  const targets = getAnimatedTargets(root).filter(
    (element) => !element.closest("[hidden]")
  );

  if (targets.length === 0) {
    return;
  }

  if (reduceMotion) {
    targets.forEach((element) => {
      element.classList.remove("reveal-init");
      element.classList.add("is-revealed");
      element.style.removeProperty("--reveal-delay");
      element.dataset.entranceReady = "true";
    });
    return;
  }

  if (restart) {
    targets.forEach((element) => {
      element.classList.remove("reveal-init", "is-revealed");
      element.style.removeProperty("--reveal-delay");
    });

    void root.offsetWidth;
  }

  targets.forEach((element, index) => {
    if (
      !restart &&
      element.dataset.entranceReady === "true" &&
      element.classList.contains("is-revealed")
    ) {
      return;
    }

    element.dataset.entranceReady = "true";
    element.classList.add("reveal-init");
    element.classList.remove("is-revealed");
    element.style.setProperty("--reveal-delay", `${Math.min(index % 6, 5) * 40}ms`);
  });

  requestAnimationFrame(() => {
    targets.forEach((element) => {
      element.classList.add("is-revealed");
    });
  });
}

function runScopeEntrance(scope, reduceMotion) {
  if (!scope) {
    return;
  }

  if (!reduceMotion) {
    scope.classList.remove("is-entering");
    void scope.offsetWidth;
    scope.classList.add("is-entering");
    scope.addEventListener(
      "animationend",
      () => {
        scope.classList.remove("is-entering");
      },
      { once: true }
    );
  }

  animateVisibleElements(scope, {
    restart: true,
    reduceMotion
  });
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

  let isTransitioning = false;

  const setTabButtonsState = (index) => {
    tabs.forEach((tab, tabIndex) => {
      const isActive = tabIndex === index;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.setAttribute("tabindex", isActive ? "0" : "-1");
    });
  };

  const showOnlyPanel = (index) => {
    panels.forEach((panel, panelIndex) => {
      if (!panel) {
        return;
      }

      const isActive = panelIndex === index;
      panel.classList.toggle("active", isActive);
      panel.hidden = !isActive;

      if (!isActive) {
        panel.classList.remove("is-entering", "is-leaving");
      }
    });
  };

  const activateTab = (index, moveFocus = false, isInitial = false) => {
    if (index < 0 || index >= tabs.length) {
      return;
    }

    if (!isInitial && index === activeIndex) {
      if (moveFocus) {
        tabs[index].focus();
      }
      return;
    }

    if (!isInitial && isTransitioning) {
      return;
    }

    const currentPanel = panels[activeIndex];
    const nextPanel = panels[index];

    if (!nextPanel) {
      return;
    }

    if (isInitial) {
      setTabButtonsState(index);
      showOnlyPanel(index);
      activeIndex = index;
      return;
    }

    if (moveFocus) {
      tabs[index].focus();
    }

    if (reduceMotion) {
      setTabButtonsState(index);
      showOnlyPanel(index);
      activeIndex = index;
      runScopeEntrance(nextPanel, reduceMotion);
      return;
    }

    isTransitioning = true;

    const commitSwitch = () => {
      setTabButtonsState(index);
      showOnlyPanel(index);
      activeIndex = index;
      runScopeEntrance(nextPanel, reduceMotion);
    };

    if (supportsViewTransitions) {
      const transition = document.startViewTransition(() => {
        showOnlyPanel(index);
        setTabButtonsState(index);
        activeIndex = index;
      });

      transition.ready.then(() => {
        runScopeEntrance(nextPanel, reduceMotion);
      });

      transition.finished.finally(() => {
        isTransitioning = false;
      });

      return;
    }

    if (currentPanel) {
      currentPanel.classList.remove("is-entering");
      currentPanel.classList.add("is-leaving");
    }

    window.setTimeout(() => {
      if (currentPanel) {
        currentPanel.classList.remove("is-leaving");
      }

      commitSwitch();
      isTransitioning = false;
    }, TRANSITION_EXIT_DURATION);
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      activateTab(index, false, false);
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
        activateTab(nextIndex, true, false);
      }
    });
  });

  activateTab(activeIndex, false, true);
}
