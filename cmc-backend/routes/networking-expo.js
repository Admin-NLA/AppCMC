import express from 'express';
import pool1 from '../db-neon1.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

// ========================================================
// GET /api/networking-expo/contactos
// Contactos escaneados por el expositor (Neon #1)
// ========================================================
router.get('/contactos', authRequired, async (req, res) => {
    try {
        const { empresa } = req.query;
        const userEmpresa = empresa || req.user.empresa;

        if (!userEmpresa) {
            return res.status(400).json({ error: 'Empresa no especificada' });
        }

        const result = await pool1.query(`
      SELECT
        es.e_scan_id,
        es.scanned_a_name      AS nombre,
        es.scanned_a_last_name AS apellido,
        es.scanned_a_email     AS email,
        es.scanned_a_phone     AS telefono,
        es.scanned_a_company   AS empresa_contacto,
        es.notes               AS notas,
        es.created_at          AS fecha,
        u.company              AS empresa_expositor,
        a.appointment_id,
        a.date                 AS cita_fecha,
        a.hour                 AS cita_hora,
        a.description          AS cita_descripcion,
        a.location             AS cita_lugar,
        a.status               AS cita_completada
      FROM exhibitors_scans es
      JOIN users u ON u.user_id = es.user_id
      LEFT JOIN appointments a ON a.e_scan_id = es.e_scan_id
      JOIN events ev ON ev.event_id = es.event_id
      WHERE LOWER(u.company) = LOWER($1)
        AND ev.year = EXTRACT(YEAR FROM NOW())
      ORDER BY es.created_at DESC
    `, [userEmpresa]);

        const contactos = result.rows.map(r => ({
            id: r.e_scan_id,
            nombre: `${r.nombre} ${r.apellido}`.trim(),
            email: r.email || '',
            telefono: r.telefono || '',
            empresa: r.empresa_contacto || '',
            notas: r.notas || '',
            fecha: r.fecha,
            empresa_expositor: r.empresa_expositor,
            cita: r.appointment_id ? {
                id: r.appointment_id,
                fecha: r.cita_fecha,
                hora: r.cita_hora,
                descripcion: r.cita_descripcion || '',
                lugar: r.cita_lugar || '',
                completada: r.cita_completada,
            } : null
        }));

        res.json({
            ok: true,
            empresa: userEmpresa,
            total: contactos.length,
            contactos,
            stats: {
                total_contactos: contactos.length,
                con_cita: contactos.filter(c => c.cita).length,
                citas_completadas: contactos.filter(c => c.cita?.completada === true).length,
                citas_pendientes: contactos.filter(c => c.cita && c.cita.completada === null).length,
                citas_perdidas: contactos.filter(c => c.cita?.completada === false).length,
            }
        });

    } catch (error) {
        console.error('❌ Error en /networking-expo/contactos:', error.message);
        res.status(500).json({ error: 'Error al obtener contactos', details: error.message });
    }
});

// ========================================================
// GET /api/networking-expo/stats-admin
// Estadísticas por marca para administración (Neon #1)
// ========================================================
router.get('/stats-admin', authRequired, async (req, res) => {
    try {
        if (req.user.rol !== 'super_admin' && req.user.rol !== 'staff') {
            return res.status(403).json({ error: 'Sin permisos' });
        }

        const result = await pool1.query(`
      SELECT
        u.company                                    AS empresa,
        COUNT(es.e_scan_id)                          AS total_contactos,
        COUNT(a.appointment_id)                      AS total_citas,
        COUNT(CASE WHEN a.status = true  THEN 1 END) AS citas_completadas,
        COUNT(CASE WHEN a.status = false THEN 1 END) AS citas_perdidas,
        COUNT(CASE WHEN a.status IS NULL AND a.appointment_id IS NOT NULL THEN 1 END) AS citas_pendientes
      FROM exhibitors_scans es
      JOIN users u ON u.user_id = es.user_id
      JOIN events ev ON ev.event_id = es.event_id
      LEFT JOIN appointments a ON a.e_scan_id = es.e_scan_id
      WHERE ev.year = EXTRACT(YEAR FROM NOW())
      GROUP BY u.company
      ORDER BY total_contactos DESC
    `);

        res.json({
            ok: true,
            total_marcas: result.rows.length,
            marcas: result.rows.map(r => ({
                empresa: r.empresa,
                total_contactos: parseInt(r.total_contactos),
                total_citas: parseInt(r.total_citas),
                citas_completadas: parseInt(r.citas_completadas),
                citas_perdidas: parseInt(r.citas_perdidas),
                citas_pendientes: parseInt(r.citas_pendientes),
            }))
        });

    } catch (error) {
        console.error('❌ Error en /networking-expo/stats-admin:', error.message);
        res.status(500).json({ error: 'Error al obtener stats', details: error.message });
    }
});

export default router;