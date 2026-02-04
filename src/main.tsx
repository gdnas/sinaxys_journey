import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { applyCompanyTheme, loadCompanySettings } from "@/lib/company";

// Apply saved brand/theme as early as possible (before first paint)
applyCompanyTheme(loadCompanySettings());

createRoot(document.getElementById("root")!).render(<App />);