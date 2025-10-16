import axios from "axios";
import { Item } from "../models/Item";

const API_BASE = "http://localhost:8080/items";

export const getItems = async (): Promise<Item[]> => {
  const response = await axios.get(API_BASE);
  return response.data;
};

export const importNews = async (keyword = "bitcoin"): Promise<void> => {
  const params = new URLSearchParams();
  params.append("keyword", keyword);
  await axios.post(`${API_BASE}/import-news`, params);
};
