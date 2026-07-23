import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@app/App.jsx";
import "@shared/styles/index.css";
import "@shared/styles/homeCorporatePolish.css";
import "@shared/styles/settingsDatasetsCorporatePolish.css";
import "@shared/styles/unifiedVisualDirection.css";
import "@shared/styles/realDarkMode.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
