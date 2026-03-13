// ============================================================
// BACKEND: routes/config.js (CORREGIDO)
// FIX: Ahora SÍ persiste la configuración de sede en DB
// ============================================================

import express from "express";
const router = express.Router();
import pool from "./db.js";
const { verifyToken } = require('../utils/authMiddleware');

// ============================================================
// GET /config - Obtener configuración actual
// ============================================================
router.get('/', verifyToken, async (req, res) => {
  try {
    console.log('📖 [Config] Obteniendo configuración...');
    
    const result = await pool.query('SELECT * FROM config WHERE id = 1');
    
    if (result.rows.length === 0) {
      // Si no existe, crear configuración por defecto
      console.log('⚠️ [Config] No existe config, creando por defecto...');
      const defaultConfig = await pool.query(`
        INSERT INTO config (id, sede_activa, edicion_activa)
        VALUES (1, 'mexico', 2025)
        RETURNING *
      `);
      
      return res.json(defaultConfig.rows[0]);
    }
    
    console.log('✅ [Config] Configuración obtenida:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ [Config] Error obteniendo config:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

// ============================================================
// PUT /config - Actualizar configuración (SUPER ADMIN ONLY)
// ============================================================
router.put('/', verifyToken, async (req, res) => {
  try {
    console.log('📝 [Config] Actualizando configuración...');
    console.log('📦 [Config] Body recibido:', req.body);
    console.log('👤 [Config] Usuario:', req.user.rol);
    
    // Solo super_admin puede modificar la config global
    if (req.user.rol !== 'super_admin') {
      console.log('⛔ [Config] Acceso denegado - rol:', req.user.rol);
      return res.status(403).json({ 
        error: 'Solo super_admin puede modificar la configuración global' 
      });
    }
    
    const { sede_activa, edicion_activa } = req.body;
    
    // Validaciones
    if (!sede_activa || !edicion_activa) {
      return res.status(400).json({ 
        error: 'sede_activa y edicion_activa son requeridos' 
      });
    }
    
    console.log('🔄 [Config] Actualizando:', { sede_activa, edicion_activa });
    
    // Actualizar en la base de datos
    const result = await pool.query(`
      UPDATE config 
      SET 
        sede_activa = $1, 
        edicion_activa = $2,
        updated_at = NOW()
      WHERE id = 1
      RETURNING *
    `, [sede_activa, edicion_activa]);
    
    if (result.rows.length === 0) {
      // Si no existe, crearla
      console.log('⚠️ [Config] No existe config, creando...');
      const createResult = await pool.query(`
        INSERT INTO config (id, sede_activa, edicion_activa)
        VALUES (1, $1, $2)
        RETURNING *
      `, [sede_activa, edicion_activa]);
      
      console.log('✅ [Config] Configuración creada:', createResult.rows[0]);
      return res.json(createResult.rows[0]);
    }
    
    console.log('✅ [Config] Configuración actualizada:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ [Config] Error actualizando config:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

// ============================================================
// GET /config/sedes - Listar sedes disponibles
// ============================================================
router.get('/sedes', verifyToken, async (req, res) => {
  try {
    // Obtener sedes únicas de la tabla users o una tabla de sedes
    const result = await pool.query(`
      SELECT DISTINCT sede 
      FROM users 
      WHERE sede IS NOT NULL 
      ORDER BY sede
    `);
    
    const sedes = result.rows.map(row => row.sede);
    res.json({ sedes });
  } catch (error) {
    console.error('Error obteniendo sedes:', error);
    res.status(500).json({ error: 'Error al obtener sedes' });
  }
});

// ============================================================
// GET /config/ediciones - Listar ediciones disponibles
// ============================================================
router.get('/ediciones', verifyToken, async (req, res) => {
  try {
    // Obtener ediciones únicas
    const result = await pool.query(`
      SELECT DISTINCT edicion 
      FROM users 
      WHERE edicion IS NOT NULL 
      ORDER BY edicion DESC
    `);
    
    const ediciones = result.rows.map(row => row.edicion);
    res.json({ ediciones });
  } catch (error) {
    console.error('Error obteniendo ediciones:', error);
    res.status(500).json({ error: 'Error al obtener ediciones' });
  }
});

export default router;