// utils/sedeHelper.js
// ----------------------------------------------------------
// Interpreta los PASES y determina:
// 1) qué días puede ver
// 2) qué sedes puede consultar
// 3) permisos especiales por tipo de usuario
// ----------------------------------------------------------

/* ========================================================
   MAPA DE PERMISOS POR PASE
======================================================== */
const PASES = {
  CURSO: {
    dias: [1, 2],
    sedes: ["DIA1", "DIA2"],
    puedeNetworking: false,
    puedeExpo: false,
    puedeSesiones: false,
    puedeCursos: true,
    puedeFavoritos: false
  },

  SESIONES: {
    dias: [3, 4],
    sedes: ["DIA3", "DIA4"],
    puedeNetworking: true,
    puedeExpo: true,
    puedeSesiones: true,
    puedeCursos: false,
    puedeFavoritos: true
  },

  COMBO: {
    dias: [1, 2, 3, 4],
    sedes: ["DIA1", "DIA2", "DIA3", "DIA4"],
    puedeNetworking: true,
    puedeExpo: true,
    puedeSesiones: true,
    puedeCursos: true,
    puedeFavoritos: true
  },

  GENERAL: {
    dias: [],
    sedes: [],
    puedeNetworking: true,
    puedeExpo: true,
    puedeSesiones: false,
    puedeCursos: false,
    puedeFavoritos: false
  },

  EXPOSITOR: {
    dias: [3, 4],
    sedes: ["EXPO"],
    puedeNetworking: true,
    puedeExpo: true,
    puedeSesiones: false,
    puedeCursos: false,
    puedeFavoritos: false
  },

  SPEAKER: {
    dias: [1, 2, 3, 4],
    sedes: ["DIA1", "DIA2", "DIA3", "DIA4"],
    puedeNetworking: false,
    puedeExpo: true,
    puedeSesiones: true,
    puedeCursos: false,
    puedeFavoritos: true,  // solo para sesiones del evento
  },

  STAFF: {
    dias: [1, 2, 3, 4],
    sedes: ["DIA1", "DIA2", "DIA3", "DIA4", "EXPO"],
    puedeNetworking: true,
    puedeExpo: true,
    puedeSesiones: true,
    puedeCursos: true,
    puedeFavoritos: true
  }
};

/* ========================================================
   1) DETERMINAR SEDES PERMITIDAS
======================================================== */
export function sedesPermitidasFromPases(pasesUsuario = []) {
  if (!Array.isArray(pasesUsuario)) return [];

  const sedes = new Set();

  pasesUsuario.forEach((pase) => {
    const config = PASES[pase];
    if (config?.sedes) {
      config.sedes.forEach((s) => sedes.add(s));
    }
  });

  return [...sedes];
}

/* ========================================================
   2) DETERMINAR DÍAS PERMITIDOS
======================================================== */
export function diasPermitidosFromPases(pasesUsuario = []) {
  const dias = new Set();

  pasesUsuario.forEach((pase) => {
    const config = PASES[pase];
    if (config?.dias) {
      config.dias.forEach((d) => dias.add(d));
    }
  });

  return [...dias];
}

/* ========================================================
   3) PERMISOS AVANZADOS (networking, expo, favoritos, etc)
======================================================== */
export function permisosFromPases(pasesUsuario = []) {
  const permisos = {
    puedeNetworking: false,
    puedeExpo: false,
    puedeSesiones: false,
    puedeCursos: false,
    puedeFavoritos: false
  };

  pasesUsuario.forEach((p) => {
    const conf = PASES[p];
    if (!conf) return;

    permisos.puedeNetworking ||= conf.puedeNetworking;
    permisos.puedeExpo ||= conf.puedeExpo;
    permisos.puedeSesiones ||= conf.puedeSesiones;
    permisos.puedeCursos ||= conf.puedeCursos;
    permisos.puedeFavoritos ||= conf.puedeFavoritos;
  });

  return permisos;
}

/* ========================================================
   4) ELECCIÓN AUTOMÁTICA DE SEDE POR FECHA ACTUAL
======================================================== */
export function sedeActivaPorFecha() {
  const now = new Date();
  const day = now.getDay(); // 1=Lunes, 2=Martes...

  const mapa = {
    1: "DIA1",
    2: "DIA2",
    3: "DIA3",
    4: "DIA4"
  };

  return mapa[day] || null;
}