import { useEffect } from "react";

export default function useSSE(onMessage) {
  useEffect(() => {
    const url = import.meta.env.VITE_API_URL + "/notificaciones/events";
    const evtSource = new EventSource(url);

    evtSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (err) {
        console.warn("Error SSE parse:", err);
      }
    };

    evtSource.onerror = (err) => {
      console.warn("SSE error:", err);
    };

    return () => {
      evtSource.close();
    };
  }, [onMessage]);
}