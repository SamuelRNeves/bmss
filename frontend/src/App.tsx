import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import CadastrarItem from "./pages/CadastrarItem";

function App() {
  return (
    <Router>
      <nav>
        <Link to="/">Listar Itens</Link> |{" "}
        <Link to="/cadastrar">Cadastrar Item</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cadastrar" element={<CadastrarItem />} />
      </Routes>
    </Router>
  );
}

export default App;
