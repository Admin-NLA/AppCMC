import { createContext, useContext, useState, useEffect } from "react";
import API from "../services/api";
import { getPermisosPorRolYPase } from "../utils/sedeHelper";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [permisos,    setPermisos]    = useState(null);
  const [loading,     setLoading]     = useState(true);

  // ── MODO VISTA PREVIA (solo super_admin) ─────────────────
  // previewRol: null = ver con tu rol real | string = ver como ese rol
  const [previewRol,      setPreviewRolState] = useState(null);
  const [previewTipoPase, setPreviewTipoPase] = useState(null);

  const setPreviewRol = (rol, tipoPase = null) => {
    setPreviewRolState(rol);
    setPreviewTipoPase(tipoPase);
  };

  const clearPreview = () => {
    setPreviewRolState(null);
    setPreviewTipoPase(null);
  };

  // ── buildPermisos ─────────────────────────────────────────
  function buildPermisos(userObj, overrideRol = null, overrideTipoPase = null) {
    if (!userObj) return {};
    const rol      = overrideRol      || userObj.rol;
    const tipoPase = overrideTipoPase || userObj.tipo_pase;
    return getPermisosPorRolYPase(rol, tipoPase, { ...userObj, rol, tipo_pase: tipoPase });
  }

  // Recalcular permisos cuando cambia el perfil O el previewRol
  useEffect(() => {
    if (userProfile) {
      const nuevosPermisos = buildPermisos(userProfile, previewRol, previewTipoPase);
      setPermisos(nuevosPermisos);
    } else {
      setPermisos(null);
    }
  }, [userProfile, previewRol, previewTipoPase]);

  // Guardar en localStorage cuando cambia user
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem("user",        JSON.stringify(user));
        localStorage.setItem("userProfile", JSON.stringify(user));
        localStorage.setItem("userRole",    user.rol);
      } catch (err) {
        console.error("❌ Error guardando en localStorage:", err);
      }
    }
  }, [user]);

  // ── LOGIN ─────────────────────────────────────────────────
  const login = async (email, password) => {
    const res      = await API.post("/auth/login", { email, password });
    const userData = res.data.user;
    localStorage.setItem("token", res.data.token);
    setUser(userData);
    setUserProfile(userData);
    clearPreview();
    return userData;
  };

  // ── LOGOUT ────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userProfile");
    localStorage.removeItem("userRole");
    setUser(null);
    setUserProfile(null);
    setPermisos(null);
    clearPreview();
  };

  // ── VERIFICAR SESIÓN AL CARGAR ────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }

    API.get("/auth/me")
      .then((res) => {
        const userData = res.data.user;
        setUser(userData);
        setUserProfile(userData);
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("userProfile");
        localStorage.removeItem("userRole");
        setUser(null);
        setUserProfile(null);
        setPermisos(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── updateProfile ─────────────────────────────────────────
  const updateProfile = (newData) => {
    setUserProfile((prev) => ({ ...prev, ...newData }));
  };

  // ── VALORES EXPORTADOS ────────────────────────────────────
  const value = {
    user,
    userProfile,
    permisos,
    currentUser: user,
    loading,
    // Vista previa de rol (super_admin)
    previewRol,
    previewTipoPase,
    isPreviewMode: previewRol !== null,
    setPreviewRol,
    clearPreview,
    // Métodos
    login,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}