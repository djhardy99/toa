import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
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
    <div className="page-header">
      <h1 className="brand">
        <Logo />
        toa-policy
      </h1>
      <ThemeToggle />
    </div>
  );
}

createRoot(document.getElementById("app")!).render(<App />);
