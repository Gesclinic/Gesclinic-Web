import React from "react";
// import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./AppRoutes";
import { Toaster } from "@/components/ui/toaster";

export default function App() {
  return (
    <>
      <AppRoutes />
      <Toaster />
    </>
  );
}
