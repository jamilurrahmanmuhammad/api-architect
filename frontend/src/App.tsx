/**
 * T030/T076: GREEN - Root App component with router setup and theme support.
 */

import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { useThemeStore } from './stores/themeStore';

function App() {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);

  // Apply theme class to document root
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  return <RouterProvider router={router} />;
}

export default App;
