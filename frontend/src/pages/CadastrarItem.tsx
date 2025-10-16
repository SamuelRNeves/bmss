
import React, { useState } from "react";
import { getItems, importNews } from "../api/api";
import { useNavigate } from "react-router-dom";

const CadastrarItem = () => {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.post("/items", {
        title,
        text,
        url: url || undefined
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
        <label>Título:</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} required />

        <label>Texto:</label>
        <textarea value={text} onChange={e => setText(e.target.value)} required />

        <label>URL (opcional):</label>
        <input type="url" value={url} onChange={e => setUrl(e.target.value)} />

        <button type="submit">Salvar</button>
      </form>
    </div>
  );
};

export default CadastrarItem;
