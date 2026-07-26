import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./lib/auth.jsx";
import { AnalysisModeProvider } from "./lib/analysisMode.jsx";
import "./styles/tokens.css";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <AnalysisModeProvider>
        <App />
      </AnalysisModeProvider>
    </AuthProvider>
  </React.StrictMode>
);
