// src/utils/sedeHelper.js

/**
 * MAPEO CENTRALIZADO DE PERMISOS POR ROL + TIPO_PASE
 * 
 * Retorna objeto con permisos completos según:
 * - rol: 'asistente' | 'expositor' | 'speaker' | 'staff' | 'super_admin'
 * - tipo_pase: 'general' | 'curso' | 'sesiones' | 'combo' | (null para roles especiales)
 * - user: { sede, multi_sedes, edicion, ... }
 */

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
    verPerfil: true, // Todos ven su perfil propio
    
    // ============ SEMANA 2 - PERMISOS NUEVOS ============
    verMisRegistros: false,  // Check-ins del usuario
    verQR: false,             // QR para entrada
    verMiMarca: false,        // Panel expositor (visitantes)
    verMiSesion: false,       // Panel speaker (detalles sesión)
    verStaffPanel: false,     // Panel de staff
    
    // Funcionalidades
    puedeFavoritos: false,
    esLectura: false, // true = solo lectura
    puedeEditar: false,
    puedeCrear: false,
    puedeEliminar: false,
    
    // Filtros
    diasPermitidos: [], // [1,2,3,4]
    filtraSede: true, // Por defecto filtra
    filtraEdicion: true,
    filterByUser: false, // Filtra solo registros del usuario actual
    
    // Registros
    verRegistroEntradas: false,
    verRegistroSesion: false,
    verRegistroCurso: false,
    
    // Menú
    menuItems: ['Perfil'], // Mínimo para todos
    
    // Extra
    categoria: null, // 'curso' | 'sesion' | 'todos'
  };

  // ========== SUPER ADMIN (Desarrollador - Acceso Total) ==========
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
      
      // ============ SEMANA 2 - SUPER ADMIN ============
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
      
      filtraSede: false, // Sin filtro
      filtraEdicion: false, // Sin filtro
      filterByUser: false,
      diasPermitidos: [1, 2, 3, 4],
      
      verRegistroEntradas: true,
      verRegistroSesion: true,
      verRegistroCurso: true,
      
      menuItems: [
        'Dashboard',
        'Admin Panel',
        'Staff Panel',
        'Usuarios',
        'Agenda',
        'Speakers',
        'Expositores',
        'Notificaciones',
        'Configuración',
        'Perfil',
        'Excel Import'
      ],
      
      categoria: 'todos',
    };
  }

  // ========== STAFF (Admin del evento) ==========
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
      
      // ============ SEMANA 2 - STAFF (Lectura) ============
      verMisRegistros: false,  // No ve registros de otros
      verQR: false,             // No necesita QR de otros
      verMiMarca: true,         // VE registros de expositores (lectura)
      verMiSesion: true,        // VE sesiones de speakers (lectura)
      verStaffPanel: true,      // ¡ACCESO al panel!
      
      puedeFavoritos: false,
      esLectura: true, // Lectura en agenda/speakers/expositores
      puedeEditar: false, // No edita usuarios
      puedeCrear: false,
      puedeEliminar: false,
      
      filtraSede: false, // Sin filtro
      filtraEdicion: false, // Sin filtro
      filterByUser: false,
      diasPermitidos: [1, 2, 3, 4],
      
      verRegistroEntradas: true,
      verRegistroSesion: true,
      verRegistroCurso: true,
      
      menuItems: [
        'Staff Panel',
        'Usuarios',
        'Agenda',
        'Speakers',
        'Expositores',
        'Notificaciones',
        'Perfil'
      ],
      
      categoria: 'todos',
    };
  }

  // ========== ASISTENTE (según tipo_pase) ==========
  if (rol === 'asistente') {
    
    // ============ ASISTENTE GENERAL ============
    if (tipo_pase === 'general') {
      return {
        ...permisosPorDefecto,
        
        verAgenda: false,
        verExpositores: true,
        verSpeakers: false,
        verRegistros: true,
        verMapa: true,
        verNetworking: true,
        verPerfil: true,
        
        // ============ SEMANA 2 - ASISTENTE GENERAL ============
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
        filterByUser: true,  // Solo sus registros
        diasPermitidos: [3, 4], // Solo registros D3-D4
        
        verRegistroEntradas: true,
        verRegistroSesion: false,
        verRegistroCurso: false,
        
        menuItems: [
          'Mapa Expo',
          'Expositores',
          'Networking',
          'Mis Registros',
          'QR',
          'Perfil'
        ],
        
        categoria: null,
      };
    }
    
    // ============ ASISTENTE CURSO ============
    if (tipo_pase === 'curso') {
      return {
        ...permisosPorDefecto,
        
        verAgenda: true,
        verExpositores: false,
        verSpeakers: false,
        verRegistros: true,
        verMapa: false,
        verNetworking: false,
        verPerfil: true,
        
        // ============ SEMANA 2 - ASISTENTE CURSO ============
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
        filterByUser: true,  // Solo sus registros
        diasPermitidos: [1, 2],
        
        verRegistroEntradas: true,
        verRegistroSesion: false,
        verRegistroCurso: true,
        
        menuItems: [
          'Agenda (D1-D2)',
          'Mis Registros',
          'QR',
          'Perfil'
        ],
        
        categoria: 'curso',
      };
    }
    
    // ============ ASISTENTE SESIONES ============
    if (tipo_pase === 'sesiones') {
      return {
        ...permisosPorDefecto,
        
        verAgenda: true,
        verExpositores: true,
        verSpeakers: true,
        verRegistros: true,
        verMapa: true,
        verNetworking: true,
        verPerfil: true,
        
        // ============ SEMANA 2 - ASISTENTE SESIONES ============
        verMisRegistros: true,
        verQR: true,
        verMiMarca: false,
        verMiSesion: false,
        verStaffPanel: false,
        
        puedeFavoritos: true, // ¡ÚNICO que puede marcar favoritos!
        esLectura: false,
        puedeEditar: false,
        
        filtraSede: true,
        filtraEdicion: true,
        filterByUser: true,  // Solo sus registros
        diasPermitidos: [3, 4],
        
        verRegistroEntradas: true,
        verRegistroSesion: true,
        verRegistroCurso: false,
        
        menuItems: [
          'Agenda (D3-D4)',
          'Expositores',
          'Speakers',
          'Networking',
          'Mis Registros',
          'QR',
          'Perfil'
        ],
        
        categoria: 'sesion',
      };
    }
    
    // ============ ASISTENTE COMBO ============
    if (tipo_pase === 'combo') {
      return {
        ...permisosPorDefecto,
        
        verAgenda: true,
        verExpositores: true,
        verSpeakers: true,
        verRegistros: true,
        verMapa: true,
        verNetworking: true,
        verPerfil: true,
        
        // ============ SEMANA 2 - ASISTENTE COMBO ============
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
        filterByUser: true,  // Solo sus registros
        diasPermitidos: [1, 2, 3, 4],
        
        verRegistroEntradas: true,
        verRegistroSesion: true,
        verRegistroCurso: true,
        
        menuItems: [
          'Agenda (D1-4)',
          'Expositores',
          'Speakers',
          'Networking',
          'Mis Registros',
          'QR',
          'Perfil'
        ],
        
        categoria: 'todos',
      };
    }
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
      
      // ============ SEMANA 2 - EXPOSITOR ============
      verMisRegistros: true,
      verQR: false,  // No necesita su QR
      verMiMarca: true,  // ¡PANEL DE VISITANTES!
      verMiSesion: false,
      verStaffPanel: false,
      
      puedeFavoritos: false,
      esLectura: true, // Agenda solo lectura
      puedeEditar: true, // Edita su marca
      puedeCrear: false,
      puedeEliminar: false,
      
      filtraSede: true,
      filtraEdicion: true,
      filterByUser: true,  // Solo sus registros
      diasPermitidos: [3, 4], // Solo registros D3-D4
      
      verRegistroEntradas: true,
      verRegistroSesion: false,
      verRegistroCurso: false,
      
      menuItems: [
        'Agenda (lectura)',
        'Mapa Expo',
        'Expositores',
        'Networking',
        'Mi Marca',
        'Mis Registros',
        'Perfil'
        //'Mi QR'
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
      
      // ============ SEMANA 2 - SPEAKER ============
      verMisRegistros: true,
      verQR: true,  // Su QR
      verMiMarca: false,
      verMiSesion: true,  // ¡PANEL DE SESIÓN!
      verStaffPanel: false,
      
      puedeFavoritos: false,
      esLectura: false,
      puedeEditar: true, // Edita su perfil (bio, foto)
      puedeCrear: false,
      puedeEliminar: false,
      
      filtraSede: true,
      filtraEdicion: true,
      filterByUser: true,  // Solo sus registros
      diasPermitidos: [1, 2, 3, 4],
      
      verRegistroEntradas: true,
      verRegistroSesion: true, // Ve asistencia de su sesión
      verRegistroCurso: false,
      
      menuItems: [
        'Agenda',
        'Mi Sesión',
        'Mi QR',
        'Mis Registros',
        'Perfil',
        'Mapa Expo',
        'Expositores'
      ],
      
      categoria: null,
    };
  }

  // ========== FALLBACK (Rol no reconocido) ==========
  console.warn(`⚠️ Rol no reconocido: ${rol}. Retornando permisos por defecto.`);
  return permisosPorDefecto;
};

export default { getPermisosPorRolYPase };