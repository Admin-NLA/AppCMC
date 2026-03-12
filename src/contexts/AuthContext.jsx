import { createContext, useContext, useState, useEffect } from "react";
import API from "../services/api";
import { getPermisosPorRolYPase } from "../utils/sedeHelper"; // ← NUEVA IMPORTACIÓN

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [permisos, setPermisos] = useState(null);
  const [loading, setLoading] = useState(true);

  // ========== NUEVA: buildPermisos usa sedeHelper ==========
  /**
   * Construye permisos usando sedeHelper.js
   * 
   * @param {Object} userObj - Usuario con rol, tipo_pase, sede, edicion, etc
   * @returns {Object} Objeto de permisos completo
   */
  function buildPermisos(userObj) {
    if (!userObj) {
      console.warn("⚠️ buildPermisos: userObj no definido");
      return {};
    }

    const { rol, tipo_pase } = userObj;

    console.log(`🔑 buildPermisos: rol=${rol}, tipo_pase=${tipo_pase}`);

    // Llamar a sedeHelper para obtener permisos
    const permisosCentralizados = getPermisosPorRolYPase(rol, tipo_pase, userObj);

    // Log para debugging
    console.log("✅ Permisos obtenidos de sedeHelper:", permisosCentralizados);

    return permisosCentralizados;
  }
  // ========================================================

  // 🔥 EFECTO: Recalcular permisos cuando userProfile cambia
  useEffect(() => {
    if (userProfile) {
      console.log("🔄 Actualizando permisos para:", userProfile.email);
      const nuevosPermisos = buildPermisos(userProfile);
      setPermisos(nuevosPermisos);
    } else {
      setPermisos(null);
    }
  }, [userProfile]); // Se ejecuta cuando userProfile cambia

  // 🔥 EFECTO: Guardar en localStorage SIEMPRE que user cambie
  useEffect(() => {
    if (user) {
      console.log("💾 Guardando usuario en localStorage:", user.email, user.rol);
      try {
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("userProfile", JSON.stringify(user));
        localStorage.setItem("userRole", user.rol); // Extra para debugging
        console.log("✅ Usuario guardado exitosamente");
      } catch (err) {
        console.error("❌ Error guardando en localStorage:", err);
      }
    }
  }, [user]); // Se ejecuta cuando user cambia

  // ========== LOGIN ==========
  const login = async (email, password) => {
    try {
      console.log("🔐 Iniciando login para:", email);
      const res = await API.post("/auth/login", { email, password });

      const userData = res.data.user;
      console.log("✅ Login exitoso, usuario:", userData.email, userData.rol);

      // Guardar token
      localStorage.setItem("token", res.data.token);
      console.log("✅ Token guardado");

      // Actualizar estados (esto disparará useEffect de permisos y localStorage)
      setUser(userData);
      setUserProfile(userData);

      return userData;
    } catch (err) {
      console.error("❌ Error en login:", err);
      throw err;
    }
  };

  // ========== LOGOUT ==========
  const logout = () => {
    console.log("🚪 Logout");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userProfile");
    localStorage.removeItem("userRole");
    setUser(null);
    setUserProfile(null);
    setPermisos(null);
  };

  // ========== VERIFICAR SESIÓN AL CARGAR LA APP ==========
  useEffect(() => {
    const token = localStorage.getItem("token");

    console.log("🔍 Verificando sesión al cargar...");
    console.log("Token existe:", token ? "✅ Sí" : "❌ No");

    if (!token) {
      console.log("❌ No hay token, usuario no autenticado");
      setLoading(false);
      return;
    }

    console.log("📡 Llamando a /auth/me...");

    API.get("/auth/me")
      .then((res) => {
        console.log(
          "✅ /auth/me respondió:",
          res.data.user.email,
          res.data.user.rol
        );

        const userData = res.data.user;

        // Actualizar estados (esto disparará useEffects)
        setUser(userData);
        setUserProfile(userData);

        console.log("✅ Estados actualizados");
      })
      .catch((err) => {
        console.error("❌ Error en /auth/me:", err.message);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("userProfile");
        localStorage.removeItem("userRole");
        setUser(null);
        setUserProfile(null);
        setPermisos(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []); // Solo una vez al montar

  // ========== updateProfile — actualiza el perfil en memoria ==========
  // FIX: Perfil.jsx necesita actualizar el avatar en el header sin re-login
  const updateProfile = (newData) => {
    setUserProfile((prev) => ({ ...prev, ...newData }));
  };

  // ========== VALORES EXPORTADOS ==========
  const value = {
    // Estados
    user,
    userProfile,
    permisos, // ← Ahora usa sedeHelper
    currentUser: user,
    loading,

    // Métodos
    login,
    logout,
    updateProfile, // ← FIX: permite actualizar avatar/nombre sin re-login
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ========== CUSTOM HOOK ==========
export function useAuth() {
  return useContext(AuthContext);
}