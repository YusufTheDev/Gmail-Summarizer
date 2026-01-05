import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import Dashboard from "./components/Dashboard";
import "./App.css";



function AuthCallback() {
  const [searchParams] = useSearchParams();
  const loggedIn = searchParams.get("logged_in") === "true";
  const state = searchParams.get("state");

  if (loggedIn && state) {
    // Redirect to dashboard while preserving the state param
    return <Navigate to={`/dashboard?logged_in=true&state=${state}`} replace />;
  }

  // If no auth params, go to landing
  return <Navigate to="/" replace />;
}

function DashboardRoute() {
  const [searchParams] = useSearchParams();
  const state = searchParams.get("state");
  const loggedIn = searchParams.get("logged_in") === "true";

  if (!loggedIn || !state) {
    return <Navigate to="/" replace />;
  }

  return <Dashboard />;
}

function App() {
  return (
    <div className="app-container">
      <div className="texture-bg" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/callback" element={<AuthCallback />} />
          <Route path="/dashboard" element={<DashboardRoute />} />
        </Routes>
        <AuthChecker />
      </BrowserRouter>
    </div>
  );
}

// Helper to intercept the OAuth redirect to root
function AuthChecker() {
  const [searchParams] = useSearchParams();
  const loggedIn = searchParams.get("logged_in") === "true";
  const state = searchParams.get("state");
  const navigate = useNavigate(); // This hook works only inside BrowserRouter

  useEffect(() => {
    // If we land on root with auth params, go to dashboard
    if (loggedIn && state && window.location.pathname === '/') {
      navigate(`/dashboard?logged_in=true&state=${state}`, { replace: true });
    }
  }, [loggedIn, state, navigate]);

  return null;
}

export default App;
