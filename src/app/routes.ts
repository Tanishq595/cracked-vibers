import { createBrowserRouter, redirect } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./screens/Dashboard";
import { Synthesize } from "./screens/Synthesize";
import { Search } from "./screens/Search";
import { KnowledgeGraph } from "./screens/KnowledgeGraph";
import { GapAnalysis } from "./screens/GapAnalysis";
import { Planner } from "./screens/Planner";
import { Login } from "./screens/Login";
import { SignUp } from "./screens/SignUp";
import { Onboarding } from "./screens/Onboarding";

export const router = createBrowserRouter([
  {
    path: "/",
    loader: () => redirect("/login"),
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/signup",
    Component: SignUp,
  },
  {
    path: "/onboarding",
    Component: Onboarding,
  },
  {
    path: "/dashboard",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "synthesize", Component: Synthesize },
      { path: "search", Component: Search },
      { path: "knowledge-graph", Component: KnowledgeGraph },
      { path: "gaps", Component: GapAnalysis },
      { path: "planner", Component: Planner },
    ],
  },
]);