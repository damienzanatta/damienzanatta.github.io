document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-tabs]").forEach(initTabs);
});

function initTabs(root) {
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

  const activateTab = (index, moveFocus = false) => {
    tabs.forEach((tab, tabIndex) => {
      const isActive = tabIndex === index;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.setAttribute("tabindex", isActive ? "0" : "-1");

      const panel = panels[tabIndex];
      if (panel) {
        panel.classList.toggle("active", isActive);
        panel.hidden = !isActive;
      }
    });

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

  activateTab(activeIndex, false);
}
