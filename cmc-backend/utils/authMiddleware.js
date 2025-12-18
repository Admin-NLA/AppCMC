import jwt from "jsonwebtoken";

export function authRequired(req, res, next) {
  try {
    const auth = req.headers.authorization;

    if (!auth) {
      return res.status(401).json({ error: "Token no enviado" });
    }

    const token = auth.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ======================================================
    // 🔍 VALIDACIÓN DE CAMPOS NECESARIOS PARA TODA LA APP
    // ======================================================
    const user = {
      id: decoded.id,
      email: decoded.email,
      nombre: decoded.nombre,
      rol: decoded.rol || "usuario",
      pases: Array.isArray(decoded.pases) ? decoded.pases : [],
      sedeAsignada: decoded.sedeAsignada || null,
    };

    // Validaciones mínimas necesarias para el backend
    if (!user.id || !user.email) {
      return res.status(400).json({
        error: "El token no contiene información básica de usuario.",
      });
    }

    // Admin siempre debe tener rol admin
    if (user.rol !== "admin" && user.rol !== "usuario") {
      return res.status(400).json({
        error: "El token contiene un rol inválido.",
      });
    }

    // Guardarlo ya normalizado
    req.user = user;

    next();
  } catch (err) {
    console.warn("Auth error:", err);
    res.status(401).json({ error: "Token inválido" });
  }
}