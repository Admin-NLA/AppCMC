// Función para parsear categorías de WordPress
function parseWpClassList(classList = []) {
  let sede = null;
  let tipo = null;
  let year = null;

  for (const cls of classList) {
    // Buscar events_category-xxxxx
    if (cls.startsWith("events_category-")) {
      const value = cls.replace("events_category-", "");

      // Detectar país directo
      if (["chile", "mexico", "colombia"].includes(value)) {
        sede = value === "mexico" ? "MX" : value === "chile" ? "CL" : "CO";
      }

      // Detectar patrón: tipo-pais-año
      // Ejemplos: spark-cl-2025, brujula-mx-2025, cursos-co-2025
      const match = value.match(
        /(brujula|toolbox|spark|orion|tracker|cursos)-?(mx|cl|co)?-?(\d{4})/i
      );

      if (match) {
        tipo = match[1].toLowerCase();
        if (match[2]) {
          const paisCode = match[2].toLowerCase();
          sede = paisCode === "mx" ? "MX" : paisCode === "cl" ? "CL" : "CO";
        }
        year = Number(match[3]);
      }
    }
  }

  // Si no encontramos sede o año, retornar null
  if (!sede || !year) return null;

  return { 
    sede, 
    tipo: tipo || 'general', 
    year,
    categoria: tipo === 'cursos' ? 'curso' : 'sesion'
  };
}

// Función para parsear slug de WordPress
function parseSessionSlug(slug) {
  if (!slug) return null;

  const parts = slug.toLowerCase().split("-");

  if (parts.length < 3) return null;

  const year = Number(parts[parts.length - 1]);
  const country = parts[parts.length - 2];
  const tipoRaw = parts.slice(0, parts.length - 2).join("-");

  if (!year || isNaN(year)) return null;

  const countryMap = {
    mx: "MX",
    co: "CO",
    cl: "CL"
  };

  const tipoMap = {
    brujula: "brujula",
    toolbox: "toolbox",
    spark: "spark",
    orion: "orion",
    tracker: "tracker",
    cursos: "curso"
  };

  return {
    tipo: tipoMap[tipoRaw] || tipoRaw,
    sede: countryMap[country],
    year: year,
    categoria: tipoRaw === "cursos" ? "curso" : "sesion"
  };
}

export function parseSpeakerCategories(categories) {
  let sede = null;
  const eventos = [];

  categories.forEach(cat => {
    if (!cat.parent) {
      sede = cat.slug; // chile, mexico, colombia
    } else {
      eventos.push({
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        parent: cat.parent.slug
      });
    }
  });

  return { sede, eventos };
}

/*module.exports = {
  parseWpClassList,
  parseSessionSlug
};*/

export function normalizeSpeaker(wpPost) {
  // 👇 EXTRAER team-category desde _embedded
  const termsGroups = wpPost._embedded?.['wp:term'] || [];

  const teamCategories = termsGroups
    .flat()
    .filter(t => t.taxonomy === 'team-category');

  const { sede, eventos } = parseSpeakerCategories(teamCategories);

  return {
    id: wpPost.id,
    wp_id: wpPost.id,
    nombre: wpPost.title?.rendered || '',
    biografia: wpPost.content?.rendered || '',
    slug: wpPost.slug,
    foto: wpPost.featured_media || null,
    sede,          // ✅ ahora sí
    eventos,       // ✅ ahora sí
    source: 'wordpress'
  };
}