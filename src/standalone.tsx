import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppRoot } from "@/ui/screens";
import "./styles.css";

const el = document.getElementById("root");
if (!el) throw new Error("root missing");
createRoot(el).render(
  <StrictMode>
    <AppRoot />
  </StrictMode>,
);
