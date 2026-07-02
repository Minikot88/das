import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import "./styles/homeCorporatePolish.css";
import "./styles/settingsDatasetsCorporatePolish.css";
import "./styles/unifiedVisualDirection.css";
import "./styles/realDarkMode.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
