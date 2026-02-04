import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { bootstrapCompanyTheme } from "@/lib/company";

// Apply last selected company theme as early as possible (before first paint)
bootstrapCompanyTheme();

createRoot(document.getElementById("root")!).render(<App />);