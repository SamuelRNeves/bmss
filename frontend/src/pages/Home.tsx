import React, { useEffect, useState } from "react";
import { getItems, importNews } from "../api/api";
import { Item } from "../models/Item";

const Home = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = async () => {
    const data = await getItems();
    setItems(data);
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      await importNews(); // ou passe keyword ex: importNews("ethereum")
      await fetchItems();
    } catch (error) {
      console.error("Erro ao importar:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Notícias Importadas</h1>
      <button onClick={handleImport} disabled={loading}>
        {loading ? "Importando..." : "Importar Notícias"}
      </button>

      <ul>
        {items.map((item) => (
          <li key={item.id} style={{ marginBottom: "1rem" }}>
            <strong>{item.title}</strong> <br />
            <span>Fonte: {item.source}</span> <br />
            <a href={item.url} target="_blank" rel="noreferrer">Ler mais</a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Home;
