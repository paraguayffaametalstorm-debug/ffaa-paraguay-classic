import { Router } from 'express';
import {
  getUsers,
  getMembers,
  getInactiveUsers,
  addMember,
  updateUserStatus,
  updateUserRole,
  updateInactiveReason,
  bulkUploadEvent,
  activateBlackMarket
} from '../controllers/admin.controller.js';
import { getActiveMembers, getEvents } from '../controllers/events.controller.js';
import { getAllPerformances, exportPerformancesCSV, savePerformance } from '../controllers/performances.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { bulkLimiter } from '../middlewares/rateLimiter.js';
import { getSupabase } from '../db/supabase.js';
import bcrypt from 'bcryptjs';
import { generateTemporaryPassword } from '../utils/security.js';
import { logSecurityEvent } from '../utils/audit.js';

const router = Router();

// Todas las rutas de administración requieren autenticación y al menos rol ADMIN u OWNER
router.use(requireAuth);
router.use(requireRole('ADMIN', 'OWNER'));

// ========== 1. GESTIÓN DE USUARIOS / MIEMBROS ==========
router.get('/users', getUsers);
router.get('/members', getMembers);
router.get('/members/active', getActiveMembers);
router.get('/users/inactive', getInactiveUsers);

router.post('/members', addMember);
router.post('/users', addMember);

router.patch('/users/:id/inactive-reason', updateInactiveReason);

router.put('/users/:id/status', updateUserStatus);
router.patch('/users/:id/status', updateUserStatus);
router.put('/members/:id/status', updateUserStatus);
router.patch('/members/:id/status', updateUserStatus);

router.put('/users/:id/role', updateUserRole);
router.patch('/users/:id/role', updateUserRole);
router.put('/members/:id/role', updateUserRole);
router.patch('/members/:id/role', updateUserRole);

// ========== 2. EVENTOS & RENDIMIENTOS ==========
router.post('/bulk-upload', bulkLimiter, bulkUploadEvent);
router.get('/all-performances', getAllPerformances);
router.post('/performances', savePerformance);
router.get('/export-performances', exportPerformancesCSV);
router.get('/events', async (req, res) => {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: false });
      if (!error && events) {
        return res.json({ events });
      }
    }
    return res.json({ events: [] });
  } catch (e) {
    res.json({ events: [] });
  }
});
router.post('/events/activate-bm', activateBlackMarket);

// ========== 3. RESETEAR CONTRASEÑA DE USUARIO (CON VALIDACIÓN DE JERARQUÍA — HALL-022) ==========
router.post('/users/:userId/reset-password', async (req, res) => {
    try {
        const { userId } = req.params;
        const targetId = Number(userId) || userId;
        const supabase = getSupabase();

        let user = null;
        if (supabase) {
            try {
                // ✅ CONSULTA TIPADA: determinar si es UUID o INTEGER
                let userQuery = supabase
                    .from('users')
                    .select('id, user_id, nick, email, role, token_version');

                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(targetId));
                const isNumeric = /^\d+$/.test(String(targetId));

                if (isUUID) {
                    userQuery = userQuery.eq('id', targetId);
                } else if (isNumeric) {
                    userQuery = userQuery.eq('user_id', Number(targetId));
                } else {
                    userQuery = userQuery.eq('id', targetId);
                }

                const { data, error: userError } = await userQuery.limit(1);

                if (!userError && data && data.length > 0) {
                    user = data[0];
                }
            } catch (err) {
                console.warn('⚠️ Supabase user lookup falló:', err.message);
            }
        }

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // ========== VALIDACIÓN DE JERARQUÍA (HALL-022) ==========
        const actorRole = (req.user.role || 'MIEMBRO').toUpperCase();
        const targetRole = (user.role || 'MIEMBRO').toUpperCase();
        const actorUserId = req.user.user_id || req.user.id;
        const targetUserId = user.user_id || user.id;

        // 1. Bloquear auto-reseteo (el propio usuario debe usar /change-password)
        if (String(actorUserId) === String(targetUserId) || String(actorUserId) === String(user.id)) {
            return res.status(403).json({
                error: 'No puedes resetear tu propia contraseña por esta vía. Usa el cambio de contraseña personal.',
                code: 'SELF_RESET_FORBIDDEN'
            });
        }

        // 2. Proteger al OWNER: nadie excepto el propio OWNER puede resetear su contraseña
        if (targetRole === 'OWNER' && actorRole !== 'OWNER') {
            return res.status(403).json({
                error: 'No se puede resetear la contraseña del Comandante General (OWNER)',
                code: 'OWNER_PROTECTED'
            });
        }

        // 3. ADMIN solo puede resetear a MIEMBRO y VETERANO
        if (actorRole === 'ADMIN' && (targetRole === 'ADMIN' || targetRole === 'OWNER')) {
            return res.status(403).json({
                error: 'Los Administradores solo pueden resetear contraseñas de Miembros y Veteranos',
                code: 'HIERARCHY_FORBIDDEN'
            });
        }

        // 4. OWNER puede resetear a todos excepto a sí mismo (ya validado arriba)
        // ============================================================

        const tempPassword = generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        const newTokenVersion = (user.token_version || 0) + 1;

        if (supabase) {
            try {
                await supabase
                    .from('users')
                    .update({
                        password_hash: hashedPassword,
                        must_change_password: true,
                        token_version: newTokenVersion,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', user.id);
            } catch (err) {
                console.warn('⚠️ Error reseteando en Supabase:', err.message);
            }
        }

        await logSecurityEvent({
            supabase,
            userId: user.id || user.user_id,
            nick: user.nick,
            event: 'ADMIN_PASSWORD_RESET',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: { 
                reset_by: req.user.nick,
                reset_by_role: req.user.role,
                target_role: targetRole
            }
        });

        res.json({
            success: true,
            message: `Contraseña de ${user.nick} reseteada. Entrégasela por WhatsApp/Discord — no volverá a mostrarse.`,
            temporaryPassword: tempPassword
        });

    } catch (error) {
        console.error('❌ Error en reset-password:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

export default router;