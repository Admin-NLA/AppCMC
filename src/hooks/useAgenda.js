import { useEffect, useState } from "react";
import axios from "../api/axios";

export default function useAgenda(eventoActivo) {
  const [agenda, setAgenda] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!eventoActivo?.edicionActiva) return;

    const fetchAgenda = async () => {
      try {
        setLoading(true);

        const params = {
          edicion: eventoActivo.edicionActiva,
        };

        if (eventoActivo.multiSede && eventoActivo.sedeActiva) {
          params.sede = eventoActivo.sedeActiva;
        }

        const { data } = await axios.get("/agenda", { params });
        setAgenda(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAgenda();
  }, [eventoActivo]);

  return { agenda, loading, error };
}