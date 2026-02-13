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

  const login = async (email, password) => {
    try {
      const res = await API.post("/auth/login", { email, password });
      
      console.log("✅ Login response:", res.data);
      
      // Guardar token
      localStorage.setItem("token", res.data.token);
      
      // Guardar usuario completo en localStorage (por si acaso)
      localStorage.setItem("user", JSON.stringify(res.data.user));
      
      // Guardar en estado
      setUser(res.data.user);
      setUserProfile(res.data.user);
      
      console.log("✅ Usuario guardado:", res.data.user);
      
      return res.data.user;
    } catch (err) {
      console.error("❌ Error en login:", err);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setUserProfile(null);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    
    console.log("🔍 Verificando token en useEffect:", token ? "✅ Existe" : "❌ No existe");
    
    if (!token) {
      setLoading(false);
      return;
    }

    // Intentar obtener usuario desde /auth/me
    API.get("/auth/me")
      .then((res) => {
        console.log("✅ AUTH /me OK:", res.data);
        
        const userData = res.data.user;
        setUser(userData);
        setUserProfile(userData);
        
        // Guardar en localStorage también
        localStorage.setItem("user", JSON.stringify(userData));
        
        console.log("✅ Usuario cargado:", userData);
      })
      .catch((err) => {
        console.error("❌ Error en /auth/me:", err);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setUserProfile(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

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