import React, { useState } from "https://esm.sh/react@18";
import { createRoot } from "https://esm.sh/react-dom@18/client";
import { ScalesPage } from "scales-page";

const NAV_ITEMS = ["Home", "Scales", "Chords", "Progressions"];

function App() {
  const [activeSection, setActiveSection] = useState("Scales");

  let sectionContent = null;
  if (activeSection === "Scales") {
    sectionContent = React.createElement(ScalesPage, { active: true });
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
              onClick: () => setActiveSection(item),
            },
            item
          )
        
      )
    ),
    sectionContent
  );
}

const root = createRoot(document.getElementById("root"));
root.render(React.createElement(App));
