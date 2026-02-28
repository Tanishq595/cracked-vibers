import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./app/App.tsx";
import "./styles/index.css";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
  console.warn("Missing VITE_CLERK_PUBLISHABLE_KEY – Clerk auth will not work.");
}

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={publishableKey || ""}>
    <App />
  </ClerkProvider>
);
