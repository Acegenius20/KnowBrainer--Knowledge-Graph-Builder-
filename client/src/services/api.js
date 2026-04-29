import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

export const getConcepts = async () => {
  const response = await api.get("/concepts");
  return response.data || [];
};

export const createConcept = async (payload) => {
  const response = await api.post("/concepts", payload);
  return response.data;
};

export const deleteConcept = async (id) => {
  const response = await api.delete(`/concepts/${id}`);
  return response.data;
};

export const getRelations = async () => {
  const response = await api.get("/relations");
  return response.data || [];
};

export default api;
