import React from 'react';
import { AuthProvider } from './context/AuthContext.jsx';
import { RouterProvider } from 'react-router-dom';
import {router} from './router/index.jsx';
import { ThemeProvider } from './components/themeProvider';
import { Toaster } from './components/ui/sonner';

export default function App() {
  return (
    <AuthProvider>                                 {/* 2️⃣ only here */}
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <RouterProvider router={router} />
        <Toaster />
      </ThemeProvider>
    </AuthProvider>
  );
}
