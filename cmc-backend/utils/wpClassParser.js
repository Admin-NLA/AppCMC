export function parseWpClassList(classList = []) {
  let sede = null;
  let tipo = null;
  let year = null;

  for (const cls of classList) {
    // events_category-chile
    if (cls.startsWith("events_category-")) {
      const value = cls.replace("events_category-", "");

      // país directo
      if (["chile", "mexico", "colombia"].includes(value)) {
        sede = value === "mexico" ? "MX" : value === "chile" ? "CL" : "CO";
      }

      // spark-cl-2025
      const match = value.match(
        /(brujula|toolbox|spark|orion|tracker|cursos)-?(mx|cl|co)?-(\d{4})/
      );

      if (match) {
        tipo = match[1] === "cursos" ? "curso" : match[1];
        year = Number(match[3]);
      }
    }
  }

  if (!sede || !year) return null;

  return { sede, tipo, year };
}