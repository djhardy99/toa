import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Route, Routes } from "react-router";
import { About } from "./About.js";
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

function App() {
  return (
    <>
      <div className="page-header">
        <h1 className="brand">
          <Logo />
          toa-policy
        </h1>
        <nav className="nav">
          <Link to="/">Policies</Link>
          <Link to="/about">About</Link>
        </nav>
        <ThemeToggle />
      </div>
      <Routes>
        <Route path="/" element={<p className="muted">Policies will appear here.</p>} />
        <Route path="/about" element={<About />} />
      </Routes>
    </>
  );
}

createRoot(document.getElementById("app")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
