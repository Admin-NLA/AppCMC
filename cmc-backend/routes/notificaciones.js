import { Router } from "express";
const router = Router();

let clients = [];

// ===== SSE =====
router.get("/events", (req, res) => {

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // 🔥 CORS para SSE
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.flushHeaders();

  const clientId = Date.now();
  const newClient = { id: clientId, res };

  clients.push(newClient);

  console.log("🔔 Cliente SSE conectado:", clientId);

  req.on("close", () => {
    console.log("❌ Cliente SSE desconectado:", clientId);
    clients = clients.filter(c => c.id !== clientId);
  });
});

// 👉 Función global para enviar mensajes SSE
export function sendNotification(data) {
  clients.forEach(c =>
    c.res.write(`data: ${JSON.stringify(data)}\n\n`)
  );
}

export default router;
