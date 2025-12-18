import axios from "../config/axios"; // tu instancia que ya incluye Bearer token

// Obtener todas las notificaciones visibles para el usuario
export function getNotificaciones() {
  return axios.get("/notificaciones");
}

// Marcar como vista
export function marcarVista(id) {
  return axios.post(`/notificaciones/${id}/vista`);
}

// Crear notificación (solo staff/admin)
export function crearNotificacion(data) {
  return axios.post("/notificaciones", data);
}

// Editar notificación (solo staff/admin)
export function editarNotificacion(id, data) {
  return axios.put(`/notificaciones/${id}`, data);
}

// Cambiar estado activa / desactivada
export function cambiarEstado(id, activa) {
  return axios.put(`/notificaciones/${id}/estado`, { activa });
}

// Eliminar notificación
export function borrarNotificacion(id) {
  return axios.delete(`/notificaciones/${id}`);
}