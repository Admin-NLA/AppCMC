import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// ============================================================
// CMC Brand tokens — ajustar aquí para cambiar toda la página
// ============================================================
const BRAND = {
  // Logo: usar URL directa o importar desde /public
  logoUrl: "https://cmc-latam.com/wp-content/uploads/2024/09/CMC-2025-Logo-Horizontal-Blanco.png",
  // Fallback si el logo no carga
  logoAlt: "CMC Latam",
  // Tagline debajo del logo
  tagline: "Congreso de Mantenimiento y Confiabilidad",
  // Gradiente de fondo (tailwind classes)
  bgGradient: "from-[#0a1628] via-[#0d2240] to-[#1a3a5c]",
  // Color del botón principal
  btnClass: "bg-[#e8a020] hover:bg-[#d4911a] text-white",
  // Color del acento (borde del card, anillo de focus)
  accent: "#e8a020",
};

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch {
      setError("Correo o contraseña incorrectos");
    }
    setLoading(false);
  };

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center bg-gradient-to-br ${BRAND.bgGradient} px-4`}
      style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      {/* ── Fondo decorativo ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: BRAND.accent, filter: "blur(80px)" }}
        />
        <div
          className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-10"
          style={{ background: BRAND.accent, filter: "blur(100px)" }}
        />
      </div>

      {/* ── Card ── */}
      <div className="relative w-full max-w-md">

        {/* Logo + tagline */}
        <div className="flex flex-col items-center mb-8 select-none">
          <img
            src={BRAND.logoUrl}
            alt={BRAND.logoAlt}
            className="h-16 object-contain mb-3 drop-shadow-lg"
            onError={(e) => {
              e.target.style.display = "none";
              document.getElementById("cmc-text-logo").style.display = "block";
            }}
          />
          <h1
            id="cmc-text-logo"
            className="hidden text-3xl font-black tracking-widest text-white"
          >
            CMC
          </h1>
          <p className="text-sm text-blue-200 tracking-wide text-center mt-1">
            {BRAND.tagline}
          </p>
        </div>

        {/* Form card */}
        <div
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl"
          style={{ boxShadow: `0 0 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08)` }}
        >
          <h2 className="text-xl font-bold text-white mb-6 text-center">
            Acceso a la App
          </h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/40 text-red-200 text-sm px-4 py-3 rounded-lg mb-5">
              <span className="text-base">⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-blue-200 mb-1 uppercase tracking-wider">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:border-transparent transition"
                style={{ "--tw-ring-color": BRAND.accent }}
                onFocus={(e) => e.target.style.boxShadow = `0 0 0 2px ${BRAND.accent}`}
                onBlur={(e)  => e.target.style.boxShadow = "none"}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-blue-200 mb-1 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300/50 focus:outline-none transition"
                  onFocus={(e) => e.target.style.boxShadow = `0 0 0 2px ${BRAND.accent}`}
                  onBlur={(e)  => e.target.style.boxShadow = "none"}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white transition text-sm"
                  tabIndex={-1}
                >
                  {showPass ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl font-bold text-base tracking-wide transition-all duration-200 mt-2 ${BRAND.btnClass} disabled:opacity-50 disabled:cursor-not-allowed`}
              style={{ boxShadow: loading ? "none" : `0 4px 20px ${BRAND.accent}55` }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Verificando...
                </span>
              ) : "Ingresar"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-blue-300/50 text-xs mt-6">
          © {new Date().getFullYear()} CMC Latam · Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}