import jwt from "jsonwebtoken";

export function authRequired(req, res, next) {
  try {
    const auth = req.headers.authorization;

    if (!auth) {
      return res.status(401).json({ error: "Token no enviado" });
    }

    const token = auth.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    next();
  } catch (err) {
    console.warn("Auth error:", err);
    res.status(401).json({ error: "Token inválido" });
  }
}
