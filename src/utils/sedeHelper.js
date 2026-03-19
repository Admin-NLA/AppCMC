// src/utils/sedeHelper.js
//
// ============================================================
// CORRECCIÓN APLICADA:
//   Los roles en la DB son:
//     'asistente_general' | 'asistente_curso' |
//     'asistente_sesiones' | 'asistente_combo'
//   El código anterior esperaba rol='asistente' + tipo_pase,
//   lo que dejaba todos los asistentes sin permisos (caían
//   en el default). Ahora cada rol compuesto se resuelve
//   directamente sin depender de tipo_pase para ramificar.
// ============================================================

export const getPermisosPorRolYPase = (rol, tipo_pase, user = {}) => {

  // ========== PERMISOS POR DEFECTO (TODO BLOQUEADO) ==========
  const permisosPorDefecto = {
    // Vistas principales
    verAgenda: false,
    verExpositores: false,
    verSpeakers: false,
    verRegistros: false,
    verMapa: false,
    verNetworking: false,
    verPerfil: true,

    // Permisos de sección especial
    verMisRegistros: false,
    verQR: false,
    verMiMarca: false,
    verMiSesion: false,
    verStaffPanel: false,

    // Funcionalidades
    puedeFavoritos: false,
    esLectura: false,
    puedeEditar: false,
    puedeCrear: false,
    puedeEliminar: false,

    // Filtros
    diasPermitidos: [],
    filtraSede: true,
    filtraEdicion: true,
    filterByUser: false,

    // Registros
    verRegistroEntradas: false,
    verRegistroSesion: false,
    verRegistroCurso: false,

    // Encuestas
    verEncuestas: false,
    verGaleria:   false,

    // Menú dinámico
    menuItems: ['Perfil'],

    // Categoría de contenido
    categoria: null,
  };

  // ========== SUPER ADMIN — acceso total ==========
  if (rol === 'super_admin') {
    return {
      ...permisosPorDefecto,
      verAgenda: true,
      verExpositores: true,
      verSpeakers: true,
      verRegistros: true,
      verMapa: true,
      verNetworking: true,
      verPerfil: true,
      verMisRegistros: true,
      verQR: true,
      verMiMarca: true,
      verMiSesion: true,
      verStaffPanel: true,
      puedeFavoritos: false,
      esLectura: false,
      puedeEditar: true,
      puedeCrear: true,
      puedeEliminar: true,
      filtraSede: false,
      filtraEdicion: false,
      filterByUser: false,
      diasPermitidos: [1, 2, 3, 4],
      verRegistroEntradas: true,
      verRegistroSesion: true,
      verRegistroCurso: true,
      verEncuestas: true,
      verGaleria:   true,
      menuItems: [
        'Dashboard',
        'Admin Panel',
        'Branding',
        'Staff Panel',
        'Scanner',
        'Usuarios',
        'Agenda',
        'Mapa Expo',
        'Speakers',
        'Expositores',
        'Networking',
        'Encuestas',
        'Notificaciones',
        'Configuración',
        'Perfil',
        'Excel Import',
      ],
      categoria: 'todos',
    };
  }

  // ========== STAFF — admin del evento ==========
  if (rol === 'staff') {
    return {
      ...permisosPorDefecto,
      verAgenda: true,
      verExpositores: true,
      verSpeakers: true,
      verRegistros: true,
      verMapa: true,
      verNetworking: false,
      verPerfil: true,
      verMisRegistros: false,
      verQR: false,
      verMiMarca: true,
      verMiSesion: true,
      verStaffPanel: true,
      puedeFavoritos: false,
      esLectura: true,
      puedeEditar: false,
      puedeCrear: false,
      puedeEliminar: false,
      filtraSede: false,
      filtraEdicion: false,
      filterByUser: false,
      diasPermitidos: [1, 2, 3, 4],
      verRegistroEntradas: true,
      verRegistroSesion: true,
      verRegistroCurso: true,
      verEncuestas: true,
      verGaleria:   true,
      menuItems: [
        'Staff Panel',
        'Scanner',
        'Usuarios',
        'Agenda',
        'Speakers',
        'Expositores',
        'Galería',
        'Encuestas',
        'Notificaciones',
        'Perfil',
      ],
      categoria: 'todos',
    };
  }

  // ========== EXPOSITOR ==========
  if (rol === 'expositor') {
    return {
      ...permisosPorDefecto,
      verAgenda: true,
      verExpositores: true,
      verSpeakers: false,
      verRegistros: true,
      verMapa: true,
      verNetworking: true,
      verPerfil: true,
      verMisRegistros: true,
      verQR: false,
      verMiMarca: true,
      verMiSesion: false,
      verStaffPanel: false,
      puedeFavoritos: false,
      esLectura: true,
      puedeEditar: true,
      puedeCrear: false,
      puedeEliminar: false,
      filtraSede: true,
      filtraEdicion: true,
      filterByUser: true,
      diasPermitidos: [3, 4],
      verRegistroEntradas: true,
      verRegistroSesion: false,
      verRegistroCurso: false,
      verEncuestas: true,
      verGaleria:   true,
      menuItems: [
        'Agenda (lectura)',
        'Mapa Expo',
        'Expositores',
        'Networking',
        'Mi Marca',
        'Galería',
        'Encuestas',
        'Mis Registros',
        'Notificaciones',
        'Perfil',
      ],
      categoria: null,
    };
  }

  // ========== SPEAKER ==========
  if (rol === 'speaker') {
    return {
      ...permisosPorDefecto,
      verAgenda: true,
      verExpositores: true,
      verSpeakers: true,
      verRegistros: true,
      verMapa: true,
      verNetworking: false,
      verPerfil: true,
      verMisRegistros: true,
      verQR: true,
      verMiMarca: false,
      verMiSesion: true,
      verStaffPanel: false,
      puedeFavoritos: false,
      esLectura: false,
      puedeEditar: true,
      puedeCrear: false,
      puedeEliminar: false,
      filtraSede: true,
      filtraEdicion: true,
      filterByUser: true,
      diasPermitidos: [1, 2, 3, 4],
      verRegistroEntradas: true,
      verRegistroSesion: true,
      verRegistroCurso: false,
      verEncuestas: true,
      verGaleria:   true,
      menuItems: [
        'Agenda',
        'Mi Sesión',
        'Mi QR',
        'Mis Registros',
        'Galería',
        'Encuestas',
        'Notificaciones',
        'Mapa Expo',
        'Expositores',
        'Perfil',
      ],
      categoria: null,
    };
  }

  // ========== ASISTENTES — resueltos por rol compuesto ==========
  // FIX: La DB guarda 'asistente_general', 'asistente_curso', etc.
  // El código anterior esperaba rol='asistente' y chequeaba tipo_pase,
  // lo que nunca coincidía y dejaba permisos vacíos.
  // Ahora cada variante tiene su propio bloque directo.

  // ---- ASISTENTE GENERAL ----
  if (rol === 'asistente_general' || (rol === 'asistente' && tipo_pase === 'general')) {
    return {
      ...permisosPorDefecto,
      verAgenda: false,
      verExpositores: true,
      verSpeakers: false,
      verRegistros: true,
      verMapa: true,
      verNetworking: true,
      verPerfil: true,
      verMisRegistros: true,
      verQR: true,
      verMiMarca: false,
      verMiSesion: false,
      verStaffPanel: false,
      puedeFavoritos: false,
      esLectura: false,
      puedeEditar: false,
      filtraSede: true,
      filtraEdicion: true,
      filterByUser: true,
      diasPermitidos: [3, 4],
      verRegistroEntradas: true,
      verRegistroSesion: false,
      verRegistroCurso: false,
      verEncuestas: true,
      verGaleria:   true,
      menuItems: [
        'Mapa Expo',
        'Expositores',
        'Networking',
        'Galería',
        'Encuestas',
        'Mis Registros',
        'QR',
        'Notificaciones',
        'Perfil',
      ],
      categoria: null,
    };
  }

  // ---- ASISTENTE CURSO ----
  if (rol === 'asistente_curso' || (rol === 'asistente' && tipo_pase === 'curso')) {
    return {
      ...permisosPorDefecto,
      verAgenda: true,
      verExpositores: false,
      verSpeakers: false,
      verRegistros: true,
      verMapa: false,
      verNetworking: false,
      verPerfil: true,
      verMisRegistros: true,
      verQR: true,
      verMiMarca: false,
      verMiSesion: false,
      verStaffPanel: false,
      puedeFavoritos: false,
      esLectura: false,
      puedeEditar: false,
      filtraSede: true,
      filtraEdicion: true,
      filterByUser: true,
      diasPermitidos: [1, 2],
      verRegistroEntradas: true,
      verRegistroSesion: false,
      verRegistroCurso: true,
      verEncuestas: true,
      verGaleria:   true,
      menuItems: [
        'Agenda (D1-D2)',
        'Galería',
        'Encuestas',
        'Notificaciones',
        'Mis Registros',
        'QR',
        'Perfil',
      ],
      categoria: 'curso',
    };
  }

  // ---- ASISTENTE SESIONES ----
  if (rol === 'asistente_sesiones' || (rol === 'asistente' && tipo_pase === 'sesiones')) {
    return {
      ...permisosPorDefecto,
      verAgenda: true,
      verExpositores: true,
      verSpeakers: true,
      verRegistros: true,
      verMapa: true,
      verNetworking: true,
      verPerfil: true,
      verMisRegistros: true,
      verQR: true,
      verMiMarca: false,
      verMiSesion: false,
      verStaffPanel: false,
      puedeFavoritos: true,
      esLectura: false,
      puedeEditar: false,
      filtraSede: true,
      filtraEdicion: true,
      filterByUser: true,
      diasPermitidos: [3, 4],
      verRegistroEntradas: true,
      verRegistroSesion: true,
      verRegistroCurso: false,
      verEncuestas: true,
      verGaleria:   true,
      menuItems: [
        'Agenda (D3-D4)',
        'Expositores',
        'Mapa Expo',
        'Speakers',
        'Networking',
        'Galería',
        'Encuestas',
        'Notificaciones',
        'Mis Registros',
        'QR',
        'Perfil',
      ],
      categoria: 'sesion',
    };
  }

  // ---- ASISTENTE COMBO ----
  if (rol === 'asistente_combo' || (rol === 'asistente' && tipo_pase === 'combo')) {
    return {
      ...permisosPorDefecto,
      verAgenda: true,
      verExpositores: true,
      verSpeakers: true,
      verRegistros: true,
      verMapa: true,
      verNetworking: true,
      verPerfil: true,
      verMisRegistros: true,
      verQR: true,
      verMiMarca: false,
      verMiSesion: false,
      verStaffPanel: false,
      puedeFavoritos: true,
      esLectura: false,
      puedeEditar: false,
      filtraSede: true,
      filtraEdicion: true,
      filterByUser: true,
      diasPermitidos: [1, 2, 3, 4],
      verRegistroEntradas: true,
      verRegistroSesion: true,
      verRegistroCurso: true,
      verEncuestas: true,
      verGaleria:   true,
      menuItems: [
        'Agenda (D1-4)',
        'Expositores',
        'Mapa Expo',
        'Speakers',
        'Networking',
        'Galería',
        'Encuestas',
        'Notificaciones',
        'Mis Registros',
        'QR',
        'Perfil',
      ],
      categoria: 'todos',
    };
  }

  // ========== FALLBACK — rol no reconocido ==========
  console.warn(`⚠️ sedeHelper: rol no reconocido → "${rol}" (tipo_pase: "${tipo_pase}"). Retornando permisos vacíos.`);
  return permisosPorDefecto;
};

export default { getPermisosPorRolYPase };