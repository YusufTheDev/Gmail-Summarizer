import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import "./App.css";

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for login state in URL
    const params = new URLSearchParams(window.location.search);
    const isLoggedIn = params.get("logged_in") === "true";
    const stateParam = params.get("state");

    if (isLoggedIn && stateParam) {
      setLoggedIn(true);
      // Clean URL visually (optional, but nice)
      // window.history.replaceState({}, document.title, window.location.pathname);
      // Actually, we NEED the state param for requests, so we must keep it or store it.
      // For now, let's keep it in the URL so Dashboard can read it easily without complex context/store.
    }
    setLoading(false);
  }, []);

  if (loading) return null;

  return (
    <div className="app-container">
      {loggedIn ? <Dashboard /> : <Login />}
    </div>
  );
}

export default App;
