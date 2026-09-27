import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { RuntimeProvider } from "./application/runtime";
import { ErrorBoundary, FailureSurface } from "./ui/common";
import App from "./App";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "./styles.css";

// Routerをrender外で一度だけ作り、履歴操作と編集破棄の阻止を同じ履歴所有者で扱う。
const router = createBrowserRouter([
  {
    path: "*",
    element: (
      <RuntimeProvider>
        <App />
      </RuntimeProvider>
    ),
    errorElement: <FailureSurface retry={() => location.reload()} />,
  },
]);
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </React.StrictMode>,
);
