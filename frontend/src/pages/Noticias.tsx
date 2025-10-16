import { useEffect, useState } from "react";
import axios from "axios";
import { Item } from "../models/Item";

const Noticias = () => {
  const [noticias, setNoticias] = useState<Item[]>([]);

  useEffect(() => {
    axios.get<Item[]>("http://localhost:8080/items")
      .then(response => {
        setNoticias(response.data);
      })
      .catch(error => {
        console.error("Erro ao buscar notícias:", error);
      });
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Notícias Importadas</h1>
      {noticias.length === 0 ? (
        <p>Nenhuma notícia encontrada.</p>
      ) : (
        <ul className="space-y-4">
          {noticias.map((item) => (
            <li key={item.id} className="border p-4 rounded shadow">
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="text-sm text-gray-600 mb-2">{item.publishedAt}</p>
              <p className="mb-2">{item.text}</p>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Ler mais
              </a>
              <p className="mt-2 text-xs text-gray-500">Fonte: {item.source}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Noticias;
