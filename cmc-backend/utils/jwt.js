import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '03042023Noria.CMC.021108';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

// Generar token JWT
export const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    rol: user.rol,
    tipo_pase: user.tipo_pase,
    sede: user.sede,
    nombre: user.nombre
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRE
  });
};

// Verificar token JWT
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};