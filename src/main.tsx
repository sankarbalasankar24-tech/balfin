import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import { FinanceProvider } from "./finance/FinanceContext";
import Landing from "./pages/Landing";
import Overview from "./pages/app/Overview";
import Ledger from "./pages/app/Ledger";
import Investments from "./pages/app/Investments";
import Budgets from "./pages/app/Budgets";
import Manage from "./pages/app/Manage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <FinanceProvider>
        <Routes>
          {/* Open straight into the app — landing is optional at #/intro */}
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="/intro" element={<Landing />} />
          <Route path="/app" element={<Overview />} />
          <Route path="/app/ledger" element={<Ledger />} />
          <Route path="/app/invest" element={<Investments />} />
          <Route path="/app/budgets" element={<Budgets />} />
          <Route path="/app/manage" element={<Manage />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </FinanceProvider>
    </HashRouter>
  </StrictMode>
);
