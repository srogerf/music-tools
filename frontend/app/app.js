import React, { useCallback, useEffect, useState } from "https://esm.sh/react@18";
import { createRoot } from "https://esm.sh/react-dom@18/client";
import { ScalesPage } from "scales-page";

const NAV_ITEMS = ["Home", "Scales", "Chords", "Progressions"];
const EMPTY_SCALES_ROUTE = {
  scale: "",
  key: "",
  position: "",
  tuning: "",
  threeNps: false,
};

function normalizeSection(section) {
  const normalized = String(section || "").trim().toLowerCase();
  return NAV_ITEMS.find((item) => item.toLowerCase() === normalized) || "Scales";
}

function buildUrl(routeState) {
  const params = new URLSearchParams();

  if (routeState.section === "Scales") {
    const scales = routeState.scales || {};
    if (scales.scale) params.set("scale", scales.scale);
    if (scales.key) params.set("key", scales.key);
    if (scales.position) params.set("position", scales.position);
    if (scales.tuning) params.set("tuning", scales.tuning);
    if (scales.threeNps) params.set("threeNps", "true");
  }

  const query = params.toString();
  const hash = `#${routeState.section.toLowerCase()}`;
  return query
    ? `${window.location.pathname}?${query}${hash}`
    : `${window.location.pathname}${hash}`;
}

function readRouteState() {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  const legacySection = params.get("section");
  const section = normalizeSection(hash || legacySection);
  return {
    section,
    scales: section === "Scales"
      ? {
          scale: params.get("scale") || "",
          key: params.get("key") || "",
          position: params.get("position") || "",
          tuning: params.get("tuning") || "",
          threeNps: params.get("threeNps") === "true",
        }
      : { ...EMPTY_SCALES_ROUTE },
  };
}

function writeRouteState(routeState) {
  const nextUrl = buildUrl(routeState);
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextUrl === currentUrl) {
    return;
  }
  window.history.pushState(routeState, "", nextUrl);
}

function sameScalesRoute(left = {}, right = {}) {
  return (
    (left.scale || "") === (right.scale || "") &&
    (left.key || "") === (right.key || "") &&
    (left.position || "") === (right.position || "") &&
    (left.tuning || "") === (right.tuning || "") &&
    Boolean(left.threeNps) === Boolean(right.threeNps)
  );
}

function sameRouteState(left, right) {
  return left?.section === right?.section && sameScalesRoute(left?.scales, right?.scales);
}

function App() {
  const [routeState, setRouteState] = useState(() => readRouteState());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const legacySection = params.get("section");
    if (!window.location.hash && legacySection) {
      const nextUrl = buildUrl(routeState);
      window.history.replaceState(routeState, "", nextUrl);
    }
  }, [routeState]);

  useEffect(() => {
    const onPopState = () => setRouteState(readRouteState());
    const onHashChange = () => setRouteState(readRouteState());
    window.addEventListener("popstate", onPopState);
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  const activeSection = routeState.section;

  const updateRoute = useCallback((nextRouteState) => {
    if (sameRouteState(routeState, nextRouteState)) {
      return;
    }
    setRouteState(nextRouteState);
    writeRouteState(nextRouteState);
  }, [routeState]);

  const updateSection = useCallback((section) => {
    updateRoute({
      ...routeState,
      section,
    });
  }, [routeState, updateRoute]);

  const updateScalesRoute = useCallback((scales) => {
    updateRoute({
      ...routeState,
      scales: {
        ...routeState.scales,
        ...scales,
      },
    });
  }, [routeState, updateRoute]);

  let sectionContent = null;
  if (activeSection === "Scales") {
    sectionContent = React.createElement(ScalesPage, {
      active: true,
      routeState: routeState.scales,
      onRouteChange: updateScalesRoute,
    });
  } else {
    sectionContent = React.createElement(
      "section",
      { className: "panel" },
      React.createElement("h2", { className: "section-title" }, activeSection),
      React.createElement(
        "p",
        { className: "subhead" },
        `${activeSection} tools are coming next.`
      )
    );
  }

  return React.createElement(
    "main",
    null,
    React.createElement(
      "header",
      { className: "app-header" },
      React.createElement("h1", null, "Rifferone"),
      React.createElement(
        "nav",
        { className: "top-nav", "aria-label": "Main navigation" },
        NAV_ITEMS.map((item) =>
          React.createElement(
            "button",
            {
              key: item,
              type: "button",
              className: `nav-item ${activeSection === item ? "nav-item-active" : ""}`,
              onClick: () => updateSection(item),
            },
            item
          )
        )
      )
    ),
    sectionContent
  );
}

const root = createRoot(document.getElementById("root"));
root.render(React.createElement(App));
