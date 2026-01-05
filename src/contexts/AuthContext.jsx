import { createContext, useContext, useState, useEffect } from "react";
import API from "../services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (email, password) => {
    const res = await API.post("/auth/login", { email, password });
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    setUserProfile(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setUserProfile(null);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    API.get("/auth/me")
    .then((res) => {
      console.log("AUTH /me OK:", res.data);
      setUser(res.data.user);
      setUserProfile(res.data.user);
    })
      .catch(() => {
        localStorage.removeItem("token");
        setUser(null);
        setUserProfile(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        userProfile,
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