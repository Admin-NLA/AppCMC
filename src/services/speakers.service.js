const WP_API = "https://cmc-latam.com/wp-json/cmc/v1";

export const getSpeakers = async () => {
  const res = await fetch(`${WP_API}/speakers`);
  if (!res.ok) {
    throw new Error("Error cargando speakers");
  }
  return await res.json();
};