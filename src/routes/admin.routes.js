import { Router } from 'express';
import {
  getMembers,
  addMember,
  updateMemberStatus,
  updateMemberRole,
  bulkUploadEvent,
  activateBlackMarket
} from '../controllers/admin.controller.js';
import { getActiveMembers } from '../controllers/events.controller.js';
import { getAllPerformances, exportPerformancesCSV } from '../controllers/performances.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { bulkLimiter } from '../middlewares/rateLimiter.js';
import { memoryStore, getSupabase } from '../db/supabase.js';
import bcrypt from 'bcryptjs';

const router = Router();

// All admin routes require authentication and at least ADMIN or OWNER role
router.use(requireAuth);
router.use(requireRole('ADMIN', 'OWNER'));

router.get('/members', getMembers);
router.get('/members/active', getActiveMembers);
router.post('/members', addMember);
router.patch('/members/:id/status', updateMemberStatus);
router.patch('/members/:id/role', requireRole('OWNER'), updateMemberRole);
router.post('/bulk-upload', bulkLimiter, bulkUploadEvent);
router.get('/all-performances', getAllPerformances);
router.get('/export-performances', exportPerformancesCSV);
router.get('/events', (req, res) => res.json({ events: memoryStore.events }));
router.post('/events/activate-bm', activateBlackMarket);

// ========== RESETEAR CONTRASEÑA DE USUARIO ==========
router.post('/users/:userId/reset-password', async (req, res) => {
    try {
        const { userId } = req.params;
        const supabase = getSupabase();

        if (!supabase) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }

        // Verificar que el usuario existe
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, nick, email')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Resetear a '123456' y forzar cambio
        const tempPassword = '123456';
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const { error: updateError } = await supabase
            .from('users')
            .update({
                password_hash: hashedPassword,
                must_change_password: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (updateError) {
            console.error('Error reseteando contraseña:', updateError);
            return res.status(500).json({ error: 'Error al resetear la contraseña' });
        }

        res.json({
            success: true,
            message: `Contraseña de ${user.nick} reseteada a '123456'. Deberá cambiarla al iniciar sesión.`
        });

    } catch (error) {
        console.error('❌ Error en reset-password:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

export default router;