"use client";

import { useEffect } from "react";

/**
 * Forces dark theme for the home page only
 * This component should only be used on the home page
 * The dashboard will manage its own theme via ThemeProvider
 */
export function DarkThemeWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Force dark theme on mount (home page always uses dark)
    document.documentElement.classList.add("dark");
    
    // Cleanup: This will run when navigating away from home page
    // The dashboard's ThemeProvider will then manage the theme
    return () => {
      // Don't remove dark class here - let the dashboard ThemeProvider handle it
      // This ensures smooth transition
    };
  }, []);

  return (
    <div 
      className="relative min-h-screen w-full" 
      style={{ 
        margin: 0, 
        padding: 0, 
        position: 'relative',
        top: 0,
        left: 0,
        right: 0,
        marginTop: 0,
        paddingTop: 0
      }}
    >
      {children}
    </div>
  );
}

