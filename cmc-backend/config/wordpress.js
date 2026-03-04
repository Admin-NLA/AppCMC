import axios from "axios";

// ============================================================
// config/wordpress.js
// Cliente HTTP para la API REST de WordPress (cmc-latam.com)
// ============================================================

export const WP_BASE_URL =
  process.env.WP_API_URL || "https://cmc-latam.com/wp-json/wp/v2";

const WP_AUTH = {
  username: process.env.WP_USERNAME || "",
  password: process.env.WP_APP_PASSWORD || "",
};

/** Cliente axios preconfigurado para WordPress */
export const wordpressAPI = axios.create({
  baseURL: WP_BASE_URL,
  timeout: 10000,
  auth: WP_AUTH.username && WP_AUTH.password ? WP_AUTH : undefined,
});

/** Obtiene una colección de posts personalizados */
export const getCustomPosts = async (postType, params = {}) => {
  const res = await wordpressAPI.get(`/${postType}`, {
    params: { per_page: 100, ...params },
  });
  return res.data;
};

/** Obtiene un post específico por ID */
export const getPostById = async (postType, id) => {
  const res = await wordpressAPI.get(`/${postType}/${id}`);
  return res.data;
};

/** Shorthand: sesiones del evento */
export const getSessions = (params = {}) =>
  getCustomPosts("session", params);

/** Shorthand: speakers (team-members) */
export const getSpeakers = (params = {}) =>
  getCustomPosts("team-member", params);