import React, { useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

const CadastrarItem = () => {
  const [tipo, setTipo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [userId, setUserId] = useState<number>(1); // ajuste conforme o ID de teste
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.post("/items", {
        tipo,
        descricao,
        user: { id: userId }
      });

      alert("Item cadastrado com sucesso!");
      navigate("/"); // redireciona para home
    } catch (error) {
      console.error("Erro ao cadastrar item:", error);
      alert("Erro ao cadastrar item.");
    }
  };

  return (
    <div>
      <h1>Cadastrar Item</h1>
      <form onSubmit={handleSubmit}>
        <label>Tipo:</label>
        <input type="text" value={tipo} onChange={e => setTipo(e.target.value)} required />

        <label>Descrição:</label>
        <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)} required />

        <button type="submit">Salvar</button>
      </form>
    </div>
  );
};

export default CadastrarItem;
