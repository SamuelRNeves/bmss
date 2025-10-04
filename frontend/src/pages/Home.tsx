import React, { useEffect, useState } from "react";
import api from "../api/api";
import { Item } from "../models/Item";

const Home = () => {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    api.get("/items") 
      .then(response => {
        setItems(response.data);
      })
      .catch(error => {
        console.error("Erro ao buscar itens:", error);
      });
  }, []);

  return (
    <div>
      <h1>Itens Cadastrados</h1>
      <ul>
        {items.map(item => (
          <li key={item.id}>{item.tipo} - {item.descricao}</li>
        ))}
      </ul>
    </div>
  );
};

export default Home;
