// src/utils/sedeHelper.js
// Permisos por rol — CMC Latam
//
// ROLES DEL SISTEMA (8):
//   asistente_general | asistente_curso | asistente_sesiones | asistente_combo
//   expositor | speaker | staff | super_admin
//
// Fuente de verdad: Roles.xlsx (Mapeo por rol)
// Última revisión: 2026-03-19

export const getPermisosPorRolYPase = (rol, tipo_pase, user = {}) => {

  // ── DEFAULTS — todo bloqueado ────────────────────────────
  const D = {
    verAgenda:           false,
    verExpositores:      false,
    verSpeakers:         false,
    verRegistros:        false,
    verMapa:             false,
    verNetworking:       false,
    verPerfil:           true,
    verMisRegistros:     false,
    verQR:               false,
    verMiMarca:          false,
    verMiSesion:         false,
    verStaffPanel:       false,
    verEncuestas:        false,
    verGaleria:          false,   // eliminada — siempre false
    puedeFavoritos:      false,
    esLectura:           false,
    puedeEditar:         false,
    puedeCrear:          false,
    puedeEliminar:       false,
    diasPermitidos:      [],
    filtraSede:          true,
    filtraEdicion:       true,
    filterByUser:        false,
    verRegistroEntradas: false,
    verRegistroSesion:   false,
    verRegistroCurso:    false,
    menuItems:           ['Perfil'],
    categoria:           null,
  };

  // ══════════════════════════════════════════════════════════
  // SUPER ADMIN — acceso total
  // Excel: Dashboard, Admin Panel, Staff Panel, Usuarios,
  //        Agenda, Speakers, Expositores, Notificaciones,
  //        Configuración, Perfil, Excel Import + todo lo demás
  // ══════════════════════════════════════════════════════════
  if (rol === 'super_admin') {
    return {
      ...D,
      verAgenda:           true,
      verExpositores:      true,
      verSpeakers:         true,
      verRegistros:        true,
      verMapa:             true,
      verNetworking:       true,
      verPerfil:           true,
      verMisRegistros:     true,
      verQR:               true,
      verMiMarca:          true,
      verMiSesion:         true,
      verStaffPanel:       true,
      verEncuestas:        true,
      puedeFavoritos:      false,
      esLectura:           false,
      puedeEditar:         true,
      puedeCrear:          true,
      puedeEliminar:       true,
      filtraSede:          false,
      filtraEdicion:       false,
      diasPermitidos:      [1,2,3,4],
      verRegistroEntradas: true,
      verRegistroSesion:   true,
      verRegistroCurso:    true,
      menuItems: [
        'Dashboard',
        'Admin Panel',
        'Branding',
        'Configuración',
        'Staff Panel',
        'Scanner',
        'Usuarios',
        'Excel Import',
        'Agenda',
        'Mapa Expo',
        'Speakers',
        'Expositores',
        'Encuestas',
        'Notificaciones',
        'Networking',
        'Perfil',
      ],
      categoria: 'todos',
    };
  }

  // ══════════════════════════════════════════════════════════
  // STAFF — admin operativo del evento
  // Excel: Staff Panel ✅, Scanner ✅, Estadísticas ✅
  //        Agenda VER ✅, Speakers VER ✅, Expositores VER ✅
  //        Usuarios VER ✅, Notificaciones ✅, Mapa Expo ✅
  //        Perfil propio ✅
  //        NO: editar usuarios, crear eventos, Admin Panel
  // ══════════════════════════════════════════════════════════
  if (rol === 'staff') {
    return {
      ...D,
      verAgenda:           true,
      verExpositores:      true,
      verSpeakers:         true,
      verRegistros:        true,
      verMapa:             true,
      verNetworking:       false,
      verPerfil:           true,
      verMisRegistros:     false,
      verQR:               false,
      verMiMarca:          false,
      verMiSesion:         false,
      verStaffPanel:       true,
      verEncuestas:        true,
      esLectura:           true,
      puedeEditar:         false,
      puedeCrear:          false,
      puedeEliminar:       false,
      filtraSede:          false,
      filtraEdicion:       false,
      diasPermitidos:      [1,2,3,4],
      verRegistroEntradas: true,
      verRegistroSesion:   true,
      verRegistroCurso:    true,
      menuItems: [
        'Staff Panel',
        'Scanner',
        'Usuarios',
        'Agenda',
        'Mapa Expo',
        'Speakers',
        'Expositores',
        'Encuestas',
        'Notificaciones',
        'Perfil',
      ],
      categoria: 'todos',
    };
  }

  // ══════════════════════════════════════════════════════════
  // EXPOSITOR
  // Excel: Agenda SOLO LECTURA ✅, Mapa Expo ✅, Expositores ✅
  //        Networking ✅ (editar disponibilidad), Mi Marca ✅
  //        QR (vCard) ✅, Registro entradas D3-D4 ✅
  //        NO: favoritos, crear/editar agenda, ver otros usuarios
  // ══════════════════════════════════════════════════════════
  if (rol === 'expositor') {
    return {
      ...D,
      verAgenda:           true,
      verExpositores:      true,
      verSpeakers:         false,
      verRegistros:        true,
      verMapa:             true,
      verNetworking:       true,
      verPerfil:           true,
      verMisRegistros:     true,
      verQR:               true,    // ✅ QR vCard según Excel
      verMiMarca:          true,
      verMiSesion:         false,
      verStaffPanel:       false,
      verEncuestas:        true,
      esLectura:           true,    // agenda solo lectura
      puedeEditar:         true,    // su propio perfil de marca
      filtraSede:          true,
      filtraEdicion:       true,
      filterByUser:        true,
      diasPermitidos:      [3,4],
      verRegistroEntradas: true,
      menuItems: [
        'Agenda (lectura)',
        'Mapa Expo',
        'Expositores',
        'Mi Marca',
        'Networking',
        'Encuestas',
        'Mis Registros',
        'Mi QR',
        'Notificaciones',
        'Perfil',
      ],
      categoria: null,
    };
  }

  // ══════════════════════════════════════════════════════════
  // SPEAKER
  // Excel: Agenda completa D1-4 ✅, Mi Sesión ⭐ ✅
  //        Mapa Expo ✅, Expositores ✅, QR (vCard) ✅
  //        Registro número de asistentes a su sesión ⚠️
  //        NO: Networking ❌, favoritos ❌, crear/editar agenda ❌
  // ══════════════════════════════════════════════════════════
  if (rol === 'speaker') {
    return {
      ...D,
      verAgenda:           true,
      verExpositores:      true,
      verSpeakers:         true,
      verRegistros:        true,
      verMapa:             true,
      verNetworking:       false,   // ❌ Excel explícito
      verPerfil:           true,
      verMisRegistros:     true,
      verQR:               true,
      verMiMarca:          false,
      verMiSesion:         true,
      verStaffPanel:       false,
      verEncuestas:        true,
      puedeFavoritos:      false,
      esLectura:           false,
      puedeEditar:         true,    // su propia bio/foto
      filtraSede:          true,
      filtraEdicion:       true,
      filterByUser:        true,
      diasPermitidos:      [1,2,3,4],
      verRegistroEntradas: true,
      verRegistroSesion:   true,
      menuItems: [
        'Agenda',
        'Mi Sesión',
        'Mapa Expo',
        'Expositores',
        'Encuestas',
        'Notificaciones',
        'Mis Registros',
        'Mi QR',
        'Perfil',
      ],
      categoria: null,
    };
  }

  // ══════════════════════════════════════════════════════════
  // ASISTENTE GENERAL
  // Excel: Mapa Expo ✅, Expositores ✅, Networking ✅
  //        QR (vCard) ✅, Perfil ✅
  //        NO: Agenda ❌, Speakers ❌, Favoritos ❌, Cursos ❌
  // Menú: [ Mapa Expo ] [ Expositores ] [ Networking ] [ Perfil ]
  // ══════════════════════════════════════════════════════════
  if (rol === 'asistente_general' || (rol === 'asistente' && tipo_pase === 'general')) {
    return {
      ...D,
      verAgenda:           false,
      verExpositores:      true,
      verSpeakers:         false,
      verRegistros:        true,
      verMapa:             true,
      verNetworking:       true,
      verPerfil:           true,
      verMisRegistros:     true,
      verQR:               true,
      verEncuestas:        true,
      filtraSede:          true,
      filtraEdicion:       true,
      filterByUser:        true,
      verRegistroEntradas: true,
      menuItems: [
        'Mapa Expo',
        'Expositores',
        'Networking',
        'Encuestas',
        'Mis Registros',
        'Mi QR',
        'Notificaciones',
        'Perfil',
      ],
      categoria: null,
    };
  }

  // ══════════════════════════════════════════════════════════
  // ASISTENTE CURSO
  // Excel: Agenda D1-D2 SOLO CURSOS ✅, QR ✅, Mis Registros ✅
  //        Inscripción cursos ✅, Registro cursos asistidos ✅
  //        NO: Expositores ❌, Speakers ❌, Networking ❌
  //            Mapa Expo ❌, Favoritos ❌, Agenda D3-D4 ❌
  // Menú: [ Agenda (D1-D2) ] [ Perfil ] [ QR / Registros ]
  // ══════════════════════════════════════════════════════════
  if (rol === 'asistente_curso' || (rol === 'asistente' && tipo_pase === 'curso')) {
    return {
      ...D,
      verAgenda:           true,
      verExpositores:      false,
      verSpeakers:         false,
      verRegistros:        true,
      verMapa:             false,
      verNetworking:       false,
      verPerfil:           true,
      verMisRegistros:     true,
      verQR:               true,
      verEncuestas:        true,
      filtraSede:          true,
      filtraEdicion:       true,
      filterByUser:        true,
      diasPermitidos:      [1,2],
      verRegistroEntradas: true,
      verRegistroCurso:    true,
      menuItems: [
        'Agenda (D1-D2)',
        'Encuestas',
        'Notificaciones',
        'Mis Registros',
        'Mi QR',
        'Perfil',
      ],
      categoria: 'curso',
    };
  }

  // ══════════════════════════════════════════════════════════
  // ASISTENTE SESIONES
  // Excel: Agenda D3-D4 SOLO SESIONES ✅, Expositores ✅
  //        Speakers D3-D4 ✅, Mapa Expo ✅, Networking ✅
  //        Favoritos ✅, Registro sesiones asistidas ✅
  //        NO: Cursos ❌, Inscripción cursos ❌, Agenda D1-D2 ❌
  // Menú: [ Agenda(D3-D4) ] [ Expositores ] [ Speakers ]
  //        [ Networking ] [ Perfil ] [ QR / Registros ]
  // ══════════════════════════════════════════════════════════
  if (rol === 'asistente_sesiones' || (rol === 'asistente' && tipo_pase === 'sesiones')) {
    return {
      ...D,
      verAgenda:           true,
      verExpositores:      true,
      verSpeakers:         true,
      verRegistros:        true,
      verMapa:             true,
      verNetworking:       true,
      verPerfil:           true,
      verMisRegistros:     true,
      verQR:               true,
      verEncuestas:        true,
      puedeFavoritos:      true,
      filtraSede:          true,
      filtraEdicion:       true,
      filterByUser:        true,
      diasPermitidos:      [3,4],
      verRegistroEntradas: true,
      verRegistroSesion:   true,
      menuItems: [
        'Agenda (D3-D4)',
        'Expositores',
        'Mapa Expo',
        'Speakers',
        'Networking',
        'Encuestas',
        'Notificaciones',
        'Mis Registros',
        'Mi QR',
        'Perfil',
      ],
      categoria: 'sesion',
    };
  }

  // ══════════════════════════════════════════════════════════
  // ASISTENTE COMBO — acceso total (Curso + Sesiones)
  // Excel: TODO ✅ — es el combo de curso + sesiones
  //        Agenda D1-4 ✅, Expositores ✅, Speakers ✅
  //        Networking ✅, Mapa Expo ✅, Favoritos ✅
  //        Cursos + Sesiones ✅, Inscripción ✅
  // Menú: [ Agenda(D1-4) ] [ Expositores ] [ Speakers ]
  //        [ Networking ] [ Perfil ] [ QR / Registros ]
  // ══════════════════════════════════════════════════════════
  if (rol === 'asistente_combo' || (rol === 'asistente' && tipo_pase === 'combo')) {
    return {
      ...D,
      verAgenda:           true,
      verExpositores:      true,
      verSpeakers:         true,
      verRegistros:        true,
      verMapa:             true,
      verNetworking:       true,
      verPerfil:           true,
      verMisRegistros:     true,
      verQR:               true,
      verEncuestas:        true,
      puedeFavoritos:      true,
      filtraSede:          true,
      filtraEdicion:       true,
      filterByUser:        true,
      diasPermitidos:      [1,2,3,4],
      verRegistroEntradas: true,
      verRegistroSesion:   true,
      verRegistroCurso:    true,
      menuItems: [
        'Agenda (D1-4)',
        'Expositores',
        'Mapa Expo',
        'Speakers',
        'Networking',
        'Encuestas',
        'Notificaciones',
        'Mis Registros',
        'Mi QR',
        'Perfil',
      ],
      categoria: 'todos',
    };
  }

  // ── FALLBACK ─────────────────────────────────────────────
  console.warn(`⚠️ sedeHelper: rol no reconocido → "${rol}". Retornando permisos vacíos.`);
  return D;
};

export default { getPermisosPorRolYPase };