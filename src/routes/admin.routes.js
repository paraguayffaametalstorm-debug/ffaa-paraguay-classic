import { Router } from 'express';
import {
  getUsers,
  getMembers,
  addMember,
  updateUserStatus,
  updateUserRole,
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
// Listar usuarios
router.get('/users', getUsers);
router.get('/members', getMembers);
router.get('/members/active', getActiveMembers);

// Registrar nuevo piloto
router.post('/members', addMember);
router.post('/users', addMember);

// Cambiar estado (ACTIVE / INACTIVE)
router.put('/users/:id/status', updateUserStatus);
router.patch('/users/:id/status', updateUserStatus);
router.put('/members/:id/status', updateUserStatus);
router.patch('/members/:id/status', updateUserStatus);

// Cambiar rol (MIEMBRO / VETERANO / ADMIN / OWNER con validación de límites)
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

// ========== 3. RESETEAR CONTRASEÑA DE USUARIO ==========
router.post('/users/:userId/reset-password', async (req, res) => {
    try {
        const { userId } = req.params;
        const targetId = Number(userId) || userId;
        const supabase = getSupabase();

        let user = null;
        if (supabase) {
            try {
                const { data, error: userError } = await supabase
                    .from('users')
                    .select('id, user_id, nick, email, token_version')
                    .or(`id.eq.${targetId},user_id.eq.${targetId}`)
                    .limit(1);

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

        // ✅ GENERAR CONTRASEÑA TEMPORAL ALEATORIA
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
                        password_changed_at: new Date().toISOString(),
                        token_version: newTokenVersion,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', user.id);
            } catch (err) {
                console.warn('⚠️ Error reseteando en Supabase:', err.message);
            }
        }

        // Registrar evento de auditoría
        await logSecurityEvent({
            supabase,
            userId: user.id || user.user_id,
            nick: user.nick,
            event: 'ADMIN_PASSWORD_RESET',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: { 
                reset_by: req.user.nick,
                reset_by_role: req.user.role
            }
        });

        // ✅ La contraseña se muestra UNA SOLA VEZ
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
