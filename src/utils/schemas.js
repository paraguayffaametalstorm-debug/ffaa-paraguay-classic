import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Debe ser un correo electrónico válido'),
  password: z.string().min(1, 'La contraseña es obligatoria')
});

export const ChangePasswordSchema = z.object({
  current_password: z.string().optional(),
  new_password: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres')
});

export const PerformanceSchema = z.object({
  event_id: z.string().min(3, 'Identificador de evento inválido'),
  tokens: z.number().int().min(0, 'Tokens no pueden ser negativos').max(300, 'Máximo 300 tokens por evento'),
  days_connected: z.number().int().min(0).max(7),
  flew_in_group: z.boolean().optional().default(false),
  notes: z.string().max(500, 'Las notas no pueden superar 500 caracteres').optional().nullable(),
  user_id: z.number().int().optional()
});

export const BulkUploadSchema = z.object({
  event_id: z.string().min(3, 'ID de evento requerido'),
  performances: z.array(
    z.object({
      nick: z.string().min(2, 'Nickname de piloto demasiado corto'),
      tokens: z.number().int().min(0).max(300),
      role: z.enum(['MIEMBRO', 'VETERANO', 'ADMIN', 'OWNER']).optional().default('MIEMBRO')
    })
  ).min(1, 'Debe incluir al menos un registro')
});

export const AddMemberSchema = z.object({
  nick: z.string().min(2, 'Nickname requerido'),
  email: z.string().email('Email inválido'),
  role: z.enum(['MIEMBRO', 'VETERANO', 'ADMIN', 'OWNER']).default('MIEMBRO')
});

export const UpdateMemberStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE'])
});

export const UpdateMemberRoleSchema = z.object({
  role: z.enum(['MIEMBRO', 'VETERANO', 'ADMIN', 'OWNER'])
});

export const PlaneSchema = z.object({
  avion_id: z.string().min(1, 'Modelo de avión requerido'),
  nivel: z.number().int().min(1).max(20),
  especial_nombre: z.string().optional().nullable(),
  pasiva_nombre: z.string().optional().nullable(),
  mod1_id: z.string().optional().nullable(),
  mod1_lvl: z.number().int().min(1).max(5).optional().nullable(),
  mod2_id: z.string().optional().nullable(),
  mod2_lvl: z.number().int().min(1).max(5).optional().nullable()
});

export const ProfileUpdateSchema = z.object({
  nick: z.string().min(2).max(50).optional(),
  phone: z.string().max(30).optional().nullable(),
  callsign: z.string().max(50).optional().nullable(),
  discord: z.string().max(50).optional().nullable(),
  bio: z.string().max(500).optional().nullable()
});

export const SettingsUpdateSchema = z.object({
  theme: z.enum(['militar', 'ops', 'clasico']).optional(),
  language: z.enum(['es', 'en', 'pt']).optional(),
  notif_email: z.boolean().optional(),
  notif_whatsapp: z.boolean().optional(),
  notif_status: z.boolean().optional(),
  notif_reminder: z.boolean().optional(),
  notif_announcements: z.boolean().optional()
});

export const NormativaSchema = z.object({
  titulo: z.string().min(5, 'Título muy corto'),
  codigo: z.string().min(3, 'Código de documento requerido'),
  tipo_documento: z.string().min(2),
  categoria: z.string().min(2),
  ambito_aplicacion: z.string().min(2),
  fecha_aprobacion: z.string(),
  fecha_entrada_vigor: z.string(),
  resumen: z.string().min(10),
  nivel_confidencialidad: z.enum(['PUBLICO', 'RESTRINGIDO', 'SECRETO']).default('PUBLICO')
});
