CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  password_hash TEXT,
  nombre VARCHAR(255),
  rol VARCHAR(50) DEFAULT 'asistente',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS speakers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255),
  bio TEXT,
  company VARCHAR(255),
  photo_url TEXT,
  external_source JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agenda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(512),
  description TEXT,
  start_at TIMESTAMP WITH TIME ZONE,
  end_at TIMESTAMP WITH TIME ZONE,
  room VARCHAR(255),
  speakers uuid[] DEFAULT '{}',
  external_source JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expositores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255),
  descripcion TEXT,
  stand VARCHAR(255),
  logo_url TEXT,
  contact JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mapa (
  id serial PRIMARY KEY,
  url_publica TEXT,
  storage_path TEXT,
  uploaded_by uuid REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notificaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo VARCHAR(512),
  mensaje TEXT,
  tipo VARCHAR(50),
  created_by uuid REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  meta JSONB
);

CREATE TABLE IF NOT EXISTS favoritos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES agenda(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, session_id)
);