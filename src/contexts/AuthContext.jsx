import { createContext, useContext, useState, useEffect } from "react";
import API from "../services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  //NUEVA SECCIÓN DE BUILDPERMISOS ------------------------------------>
  function buildPermisos(user) {
    // super admin y staff → TODO
    if (user.rol === "super_admin" || user.rol === "staff") {
      return {
        verAgenda: true,
        verCursos: true,
        verSesiones: true,
        verExpositores: true,
        verSpeakers: true,
        networking: true,
        puedeFavoritos: true,
        diasPermitidos: [1, 2, 3, 4],
      };
    }

    // asistentes por tipo de pase
    switch (user.tipo_pase) {
      case "curso":
        return {
          verAgenda: true,
          verCursos: true,
          verSesiones: false,
          verExpositores: false,
          verSpeakers: false,
          networking: false,
          puedeFavoritos: false,
          diasPermitidos: [1, 2],
        };

      case "sesiones":
        return {
          verAgenda: true,
          verCursos: false,
          verSesiones: true,
          verExpositores: true,
          verSpeakers: true,
          networking: true,
          puedeFavoritos: true,
          diasPermitidos: [3, 4],
        };

      case "combo":
        return {
          verAgenda: true,
          verCursos: true,
          verSesiones: true,
          verExpositores: true,
          verSpeakers: true,
          networking: true,
          puedeFavoritos: true,
          diasPermitidos: [1, 2, 3, 4],
        };

      case "general":
        return {
          verAgenda: false,
          verCursos: false,
          verSesiones: false,
          verExpositores: true,
          verSpeakers: false,
          networking: true,
          puedeFavoritos: false,
          diasPermitidos: [],
        };

      default:
        return {};
    }
  }
  //------------------------------------------------------------------>
  const [permisos, setPermisos] = useState(null);

  useEffect(() => {
    if (userProfile) {
      setPermisos(buildPermisos(userProfile));
    }
  }, [userProfile]);
  //------------------------------------------------------------------>

  const [loading, setLoading] = useState(true);

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
  }, [user]); // 🔑 IMPORTANTE: Se ejecuta cuando user cambia

  const login = async (email, password) => {
    try {
      console.log("🔐 Iniciando login para:", email);
      const res = await API.post("/auth/login", { email, password });
      
      const userData = res.data.user;
      console.log("✅ Login exitoso, usuario:", userData.email, userData.rol);
      
      // Guardar token
      localStorage.setItem("token", res.data.token);
      console.log("✅ Token guardado");
      
      // Actualizar estados (esto disparará el useEffect de arriba)
      setUser(userData);
      setUserProfile(userData);
      
      return userData;
    } catch (err) {
      console.error("❌ Error en login:", err);
      throw err;
    }
  };

  const logout = () => {
    console.log("🚪 Logout");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userProfile");
    localStorage.removeItem("userRole");
    setUser(null);
    setUserProfile(null);
  };

  // 🔑 EFECTO: Al cargar la app, verificar token y obtener usuario
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
        console.log("✅ /auth/me respondió:", res.data.user.email, res.data.user.rol);
        
        const userData = res.data.user;
        
        // Actualizar estados (esto disparará el useEffect de guardar)
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
      })
      .finally(() => {
        setLoading(false);
      });
  }, []); // Solo una vez al montar

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        userProfile,
        permisos,
        currentUser: user,
        login, 
        logout, 
        loading 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}