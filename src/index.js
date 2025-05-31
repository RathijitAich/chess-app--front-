import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import RathijitBot from "./RathijitBot";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/rathijit-bot" element={<RathijitBot />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);