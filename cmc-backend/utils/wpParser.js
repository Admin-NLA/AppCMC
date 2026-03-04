// ============================================================
// utils/wpParser.js
// Funciones para normalizar datos provenientes de WordPress
// ============================================================

/**
 * Extrae sede y lista de eventos desde las categorías de un speaker de WP.
 * @param {Array} categories - Array de categorías con { id, slug, name, parent }
 */
export function parseSpeakerCategories(categories = []) {
  let sede = null;
  const eventos = [];

  categories.forEach((cat) => {
    if (!cat.parent) {
      // Categoría raíz → es la sede (chile, mexico, colombia)
      sede = cat.slug;
    } else {
      eventos.push({
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        parent: cat.parent.slug,
      });
    }
  });

  return { sede, eventos };
}

/**
 * Normaliza un post de WordPress (team-member) al formato interno de speaker.
 * @param {Object} wpPost - Post crudo de la WP REST API con _embedded
 */
export function normalizeSpeaker(wpPost) {
  // Extraer team-category desde _embedded
  const termsGroups = wpPost._embedded?.["wp:term"] || [];

  const teamCategories = termsGroups
    .flat()
    .filter((t) => t.taxonomy === "team-category");

  const { sede, eventos } = parseSpeakerCategories(teamCategories);

  return {
    id: wpPost.id,
    wp_id: wpPost.id,
    nombre: wpPost.title?.rendered || "",
    biografia: wpPost.content?.rendered || "",
    slug: wpPost.slug,
    foto: wpPost.featured_media || null,
    sede,
    eventos,
    source: "wordpress",
  };
}