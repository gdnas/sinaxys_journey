import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { bootstrapCompanyTheme } from "@/lib/company";
import { initClarity } from "@/lib/clarity";
import { AuthProvider } from "@/lib/auth";
import { CompanyProvider } from "@/lib/company";

// Apply last selected company theme as early as possible (before first paint)
bootstrapCompanyTheme();

// Microsoft Clarity (set your project id in VITE_CLARITY_PROJECT_ID)
initClarity(import.meta.env.VITE_CLARITY_PROJECT_ID);

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <CompanyProvider>
      <App />
    </CompanyProvider>
  </AuthProvider>
);