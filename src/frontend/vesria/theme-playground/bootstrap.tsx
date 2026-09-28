import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ThemePlayground from "./main";
import "./standalone.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemePlayground />
  </StrictMode>,
);
