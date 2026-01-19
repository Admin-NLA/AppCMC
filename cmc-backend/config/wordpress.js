import axios from "axios";

// URL base de tu WordPress
export const WP_BASE_URL = process.env.WP_API_URL || 'https://cmc-latam.com/wp-json/wp/v2';

// Configuración de autenticación
const WP_AUTH = {
  username: process.env.WP_USERNAME || '',
  password: process.env.WP_APP_PASSWORD || ''
};

// Cliente de WordPress
export const wordpressAPI = axios.create({
  baseURL: WP_BASE_URL,
  timeout: 10000,
  auth: WP_AUTH.username && WP_AUTH.password ? WP_AUTH : undefined
});

// Helper para obtener posts personalizados
export const getCustomPosts = async (postType, params = {}) => {
  const res = await wordpressAPI.get(`/${postType}`, {
    params: { per_page: 100, ...params },
  });
  return res.data;
};
    /*
    console.log(`[WordPress] Obteniendo ${postType}...`);
    const response = await wordpressAPI.get(`/${postType}`, { params: defaultParams });
    console.log(`[WordPress] ✅ ${response.data.length} ${postType} obtenidos`);
    return response.data;
  } catch (error) {
    console.error(`[WordPress] ❌ Error obteniendo ${postType}:`, error.message);
    if (error.response) {
      console.error(`[WordPress] Status: ${error.response.status}`);
    }
    throw error;
  }
}; */

// Obtener un post específico por ID
export const getPostById = async (postType, id) => {
  const res = await wordpressAPI.get(`/${postType}/${id}`);
  return res.data;
};
/*  try {
    console.log(`[WordPress] Obteniendo ${postType} con ID ${id}...`);
    const response = await wordpressAPI.get(`/${postType}/${id}`);
    console.log(`[WordPress] ✅ ${postType} obtenido`);
    return response.data;
  } catch (error) {
    console.error(`[WordPress] ❌ Error obteniendo ${postType} ${id}:`, error.message);
    throw error;
  }
};*/

// Funciones específicas para CMC
export const getSessions = (params = {}) =>
  getCustomPosts("session", params);

 /* return await getCustomPosts('session', params);
};*/

export const getSpeakers = (params = {}) =>
  getCustomPosts("team-member", params);
 /* return await getCustomPosts('team-member', params);
};*/