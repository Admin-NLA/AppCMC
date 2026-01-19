import jwt from "jsonwebtoken";

// Middleware principal de autenticación
export function authRequired(req, res, next) {
  try {
    const auth = req.headers.authorization;

    if (!auth) {
      return res.status(401).json({ 
        ok: false,
        error: "Token no proporcionado" 
      });
    }

    const token = auth.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Normalizar usuario desde token
    const user = {
      id: decoded.id,
      email: decoded.email,
      nombre: decoded.nombre,
      rol: decoded.rol || "usuario",
      tipo_pase: decoded.tipo_pase || decoded.pases?.[0] || null, // Nuevo campo
      pases: Array.isArray(decoded.pases) ? decoded.pases : [],
      sede: decoded.sede || decoded.sedeAsignada || null,
      multi_sedes: decoded.multi_sedes || null,
      edicion: decoded.edicion || 2025
    };

    // Validaciones básicas
    if (!user.id || !user.email) {
      return res.status(400).json({
        ok: false,
        error: "El token no contiene información básica de usuario"
      });
    }

    // Validar rol
    const ROLES_VALIDOS = [
      "super_admin",  // ← Nuevo
      "admin",
      "staff",
      "usuario",
      "asistente",
      "speaker",
      "expositor"
    ];

    if (!ROLES_VALIDOS.includes(user.rol)) {
      return res.status(400).json({
        ok: false,
        error: "El token contiene un rol inválido"
      });
    }

    // Guardar usuario en request
    req.user = user;
    next();

  } catch (err) {
    console.warn("❌ Auth error:", err.message);
    res.status(401).json({ 
      ok: false,
      error: "Token inválido o expirado" 
    });
  }
}

// Middleware para verificar roles específicos
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        error: "No autenticado"
      });
    }

    // ✅ Super admin siempre pasa
    if (req.user.rol === 'super_admin') {
      return next();
    }

    // ✅ Admin pasa si está permitido
    if (allowedRoles.includes(req.user.rol)) {
      return next();
    }

    return res.status(403).json({
      ok: false,
      error: "No tienes el rol requerido",
      required: allowedRoles,
      current: req.user.rol
    });
  };
}

// Middleware para verificar tipo de pase
export function requireTipoPase(...allowedTipos) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        error: "No autenticado"
      });
    }

    // Si no tiene tipo_pase definido, denegar acceso
    if (!req.user.tipo_pase) {
      return res.status(403).json({
        ok: false,
        error: "No tienes un tipo de pase asignado"
      });
    }

    // ✅ Super admin y admin tienen acceso a TODO
    if (req.user.rol === 'super_admin' || req.user.rol === 'admin') {
      return next();
    }

    // Si no tiene tipo_pase definido, denegar acceso
    if (!req.user.tipo_pase) {
      return res.status(403).json({
        ok: false,
        error: "No tienes un tipo de pase asignado"
      });
    }

    // Verificar si el tipo_pase está permitido
    if (!allowedTipos.includes(req.user.tipo_pase)) {
      return res.status(403).json({
        ok: false,
        error: "Tu tipo de pase no tiene acceso a este recurso",
        required: allowedTipos,
        current: req.user.tipo_pase
      });
    }

    next();
  };
}

// Middleware para verificar acceso a días específicos
export function requireDias(...allowedDias) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        error: "No autenticado"
      });
    }

    // ✅ Super admin y admin tienen acceso a todos los días
    if (req.user.rol === 'super_admin' || req.user.rol === 'admin') {
      return next();
    }

    // Staff también tiene acceso completo
    if (req.user.tipo_pase === 'staff') {
      return next();
    }

/* ---------------------------------------------------------------------------------------------- */
    // Mapeo de tipo de pase a días permitidos
    const DIAS_POR_TIPO = {
      'curso': [1, 2],
      'sesiones': [3, 4],
      'combo': [1, 2, 3, 4],
      'general': [],
      'expositor': [1, 2, 3, 4],
      'speaker': [1, 2, 3, 4],
      'staff': [1, 2, 3, 4]
    };

    const diasPermitidos = DIAS_POR_TIPO[req.user.tipo_pase] || [];
    const tieneAcceso = allowedDias.some(dia => diasPermitidos.includes(dia));

    if (!tieneAcceso) {
      return res.status(403).json({
        ok: false,
        error: "Tu tipo de pase no tiene acceso a estos días",
        required: allowedDias,
        allowed: diasPermitidos
      });
    }

    next();
  };
}