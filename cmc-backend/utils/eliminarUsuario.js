// cmc-backend/utils/eliminarUsuario.js
//
// Lógica COMPARTIDA de eliminación definitiva de un usuario.
// Usada tanto por:
//   - DELETE /api/users/:id/permanente  (botón manual en Papelera)
//   - El cron de limpieza automática (server.js, cada 24h)
//
// Antes esta lógica vivía solo en users.routes.js, y el cron hacía
// su propio DELETE FROM users directo — sin desvincular las FKs
// relacionadas (expositores, entradas, encuestas, etc.). Eso hacía
// que el cron fallara con el mismo error de foreign key que el
// botón manual ya tenía. Centralizar esto en un solo lugar evita
// que ambos caminos vuelvan a divergir en el futuro.

/**
 * Elimina un usuario definitivamente de la base de datos,
 * desvinculando primero todas las referencias que apuntan a él.
 *
 * @param {import('pg').Pool} pool - pool de conexión a Postgres
 * @param {string} id - uuid del usuario a eliminar
 * @returns {Promise<{ok: boolean, email?: string, nombre?: string, error?: string}>}
 */
export async function eliminarUsuarioDefinitivo(pool, id) {
    const client = await pool.connect();
    try {
        const check = await client.query(
            'SELECT email, nombre FROM users WHERE id=$1', [id]
        );
        if (!check.rows.length) {
            return { ok: false, error: 'Usuario no encontrado' };
        }

        await client.query('BEGIN');

        // Tablas donde el usuario es el SUJETO del registro — se borran
        const tablas = [
            'user_sedes',
            'favoritos',
            'asistencias_sesion',
            'asistencias_curso',
            'notificaciones_vistas',
            'stand_visitas',
            'respuestas_encuesta',
            'entradas',
        ];
        for (const tabla of tablas) {
            await client.query(
                `DELETE FROM ${tabla} WHERE user_id = $1`, [id]
            ).catch(() => { }); // ignorar si la tabla no tiene esa columna
        }

        // Networking: usa solicitante_id
        await client.query(
            `DELETE FROM networking WHERE solicitante_id = $1`, [id]
        ).catch(() => { });

        // Expositores: usuario_id es OPCIONAL (la ficha de marca/contacto
        // puede existir sin un usuario administrador). Se desvincula en
        // lugar de borrar, para no perder la ficha del expositor.
        await client.query(
            `UPDATE expositores SET usuario_id = NULL WHERE usuario_id = $1`, [id]
        ).catch(() => { });

        // Columnas de AUDITORÍA (quién registró/creó/subió algo) en otras
        // tablas — se desvinculan (NULL) en lugar de borrar el registro
        // que el usuario creó, ya que ese contenido debe sobrevivir.
        const columnasAuditoria = [
            { tabla: 'asistencias_curso', columna: 'registrado_por' },
            { tabla: 'asistencias_sesion', columna: 'registrado_por' },
            { tabla: 'configuracion_evento', columna: 'updated_by' },
            { tabla: 'encuestas', columna: 'created_by' },
            { tabla: 'encuestas_config', columna: 'created_by' },
            { tabla: 'entradas', columna: 'registrado_por' },
            { tabla: 'mapa', columna: 'uploaded_by' },
            { tabla: 'notificaciones', columna: 'created_by' },
        ];
        for (const { tabla, columna } of columnasAuditoria) {
            await client.query(
                `UPDATE ${tabla} SET ${columna} = NULL WHERE ${columna} = $1`, [id]
            ).catch(() => { });
        }

        // push_subscriptions: sin valor sin el usuario propietario — se borran
        await client.query(
            `DELETE FROM push_subscriptions WHERE user_id = $1`, [id]
        ).catch(() => { });

        // Eliminar el usuario
        await client.query('DELETE FROM users WHERE id = $1', [id]);

        await client.query('COMMIT');

        return { ok: true, email: check.rows[0].email, nombre: check.rows[0].nombre };
    } catch (err) {
        await client.query('ROLLBACK').catch(() => { });
        return { ok: false, error: err.message };
    } finally {
        client.release();
    }
}