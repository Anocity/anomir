import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import AccountResources from "./pages/AccountResources";
import AccountInfoPage from "./pages/AccountInfoPage";
import { Toaster } from "./components/ui/sonner";

function App() {
  return (
    <div className="App min-h-screen bg-mir-obsidian">
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/account/:accountId/resources" element={<AccountResources />} />
          <Route path="/accounts/info" element={<AccountInfoPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
