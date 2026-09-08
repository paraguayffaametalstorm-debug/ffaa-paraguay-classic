// src/routes/admin.users.routes.js
import express from 'express';
import { getSupabase } from '../db/supabase.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Endpoint para verificar estado de usuarios (solo OWNER)
router.get('/users/status', authenticate, requireRole('OWNER'), async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable' });
    }
    const { data: users, error } = await supabase
      .from('users')
      .select('nick, email, role, created_at, last_activity, password_hash');
    
    if (error) throw error;
    
    const stats = {
      total: (users || []).length,
      byRole: {},
      withPassword: 0,
      withoutPassword: 0
    };
    
    (users || []).forEach(u => {
      stats.byRole[u.role] = (stats.byRole[u.role] || 0) + 1;
      if (u.password_hash) stats.withPassword++;
      else stats.withoutPassword++;
    });
    
    res.json({ 
      success: true, 
      stats,
      users: (users || []).map(u => ({
        nick: u.nick,
        email: u.email,
        role: u.role,
        hasPassword: !!u.password_hash
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para resetear contraseña de usuario (solo OWNER)
router.post('/users/reset-password', authenticate, requireRole('OWNER'), async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const supabase = getSupabase();
    
    if (!email) {
      return res.status(400).json({ error: 'Email requerido' });
    }
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable' });
    }
    
    const password = newPassword || Math.random().toString(36).slice(-8);
    const hashed = await bcrypt.hash(password, 10);
    
    const { error } = await supabase
      .from('users')
      .update({ 
        password_hash: hashed,
        must_change_password: true,
        updated_at: new Date().toISOString()
      })
      .eq('email', email);
    
    if (error) throw error;
    
    res.json({ 
      success: true, 
      message: `Contraseña reseteada para ${email}`,
      newPassword: password 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
