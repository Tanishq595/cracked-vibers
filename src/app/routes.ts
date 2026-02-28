import { createElement } from "react";
import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RootLayout } from "./components/RootLayout";
import { ErrorPage } from "./components/ErrorPage";
import { Dashboard } from "./screens/Dashboard";
import { Synthesize } from "./screens/Synthesize";
import { Upload } from "./screens/Upload";
import { Library } from "./screens/Library";
import { SpeakingCoachScreen } from "./screens/SpeakingCoach";
import { Search } from "./screens/Search";
import { KnowledgeGraph } from "./screens/KnowledgeGraph";
import { GapAnalysis } from "./screens/GapAnalysis";
import { Planner } from "./screens/Planner";
import { Login } from "./screens/Login";
import { SignUp } from "./screens/SignUp";
import { Onboarding } from "./screens/Onboarding";
import { NotFound } from "./screens/NotFound";
import { Landing } from "./screens/Landing";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    errorElement: createElement(ErrorPage),
    children: [
      {
        index: true,
        Component: Landing,
      },
      {
        path: "login",
        Component: Login,
      },
      {
        path: "signup",
        Component: SignUp,
      },
      {
        path: "onboarding",
        Component: Onboarding,
      },
      {
        path: "dashboard",
        Component: ProtectedRoute,
        children: [
          {
            Component: Layout,
            children: [
              { index: true, Component: Dashboard },
              { path: "synthesize", Component: Synthesize },
              { path: "upload", Component: Upload },
              { path: "library", Component: Library },
              { path: "coach", Component: SpeakingCoachScreen },
              { path: "search", Component: Search },
              { path: "knowledge-graph", Component: KnowledgeGraph },
              { path: "gaps", Component: GapAnalysis },
              { path: "planner", Component: Planner },
            ],
          },
        ],
      },
      {
        path: "*",
        Component: NotFound,
      },
    ],
  },
]);