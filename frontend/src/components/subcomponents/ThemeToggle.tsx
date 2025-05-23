"use client";
import { HiSun, HiMoon } from "react-icons/hi";
// OR using Bootstrap icons
// import { BsSun, BsMoon } from "react-icons/bs";

import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 bg-background border border-border rounded-full shadow-md transition-all hover:bg-muted"
    >
      {theme === "dark" ? (
        <HiSun className="w-6 h-6 text-yellow-400" />
      ) : (
        <HiMoon className="w-6 h-6 text-blue-600" />
      )}
    </button>
  );
}
