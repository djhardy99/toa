import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Outlet, Route, Routes } from "react-router";
import { About } from "./About.js";
import { AuthProvider, RequireAuth, useAuth } from "./auth.js";
import { Guardrails } from "./Guardrails.js";
import { Login } from "./Login.js";
import { Logo } from "./Logo.js";

type Theme = "light" | "dark";

function initialTheme(): Theme {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <button
      className="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}

function Layout() {
  const { user, logout } = useAuth();
  return (
    <>
      <div className="page-header">
        <h1 className="brand">
          <Logo />
          toa-policy
        </h1>
        <nav className="nav">
          <Link to="/">Guardrails</Link>
          <Link to="/about">About</Link>
        </nav>
        <div className="nav">
          <ThemeToggle />
          <button className="button" onClick={logout}>
            Sign out ({user})
          </button>
        </div>
      </div>
      <Outlet />
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Guardrails />} />
          <Route path="/about" element={<About />} />
        </Route>
      </Route>
    </Routes>
  );
}

createRoot(document.getElementById("app")!).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>,
);
