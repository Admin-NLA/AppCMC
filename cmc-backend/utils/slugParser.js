/* Función para Slugs de wordpress */

export function parseSessionSlug(slug) {
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