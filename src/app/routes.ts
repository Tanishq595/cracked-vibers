import { createElement } from "react";
import { createBrowserRouter, redirect } from "react-router";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RootLayout } from "./components/RootLayout";
import { ErrorPage } from "./components/ErrorPage";
import { Dashboard } from "./screens/Dashboard";
import { Search } from "./screens/Search";
import { KnowledgeGraph } from "./screens/KnowledgeGraph";
import { GapAnalysis } from "./screens/GapAnalysis";
import { Planner } from "./screens/Planner";
import { Login } from "./screens/Login";
import { SignUp } from "./screens/SignUp";
import { Onboarding } from "./screens/Onboarding";
import { NotFound } from "./screens/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    errorElement: createElement(ErrorPage),
    children: [
      {
        index: true,
        loader: () => redirect("/login"),
      },
      {
        path: "login/*",
        Component: Login,
      },
      {
        path: "sign-in/*",
        Component: Login,
      },
      {
        path: "signup/*",
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