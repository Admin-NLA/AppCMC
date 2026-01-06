import axios from 'axios';

const WP_BASE_URL = 'https://cmc-latam.com/wp-json/wp/v2';

// Headers para autenticación (si es necesario)
const WP_AUTH = {
  username: process.env.WP_USERNAME || '',
  password: process.env.WP_APP_PASSWORD || ''
};

export const wordpressAPI = axios.create({
  baseURL: WP_BASE_URL,
  timeout: 10000,
  auth: WP_AUTH.username ? WP_AUTH : undefined
});

// Helper para obtener posts personalizados
export const getCustomPosts = async (postType, params = {}) => {
  try {
    const response = await wordpressAPI.get(`/${postType}`, { params });
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${postType} from WordPress:`, error.message);
    throw error;
  }
};

export default wordpressAPI;