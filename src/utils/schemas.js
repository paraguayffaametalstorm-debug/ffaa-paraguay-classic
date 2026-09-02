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
  user_id: z.union([z.number().int(), z.string().transform(v => parseInt(v, 10))]).optional()
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
  avion_id: z.union([z.string().min(1), z.number().transform(v => String(v))]),
  nivel: z.union([z.number().int().min(1).max(20), z.string().transform(v => parseInt(v, 10))]),
  especial_nombre: z.string().optional().nullable(),
  especial_nivel: z.union([z.string(), z.number().transform(v => String(v))]).optional().nullable(),
  pasiva_nombre: z.string().optional().nullable(),
  pasiva_nivel: z.union([z.string(), z.number().transform(v => String(v))]).optional().nullable(),
  mod1_id: z.union([z.string(), z.number().transform(v => String(v))]).optional().nullable(),
  mod1_lvl: z.union([z.number().int().min(1).max(5), z.string().transform(v => parseInt(v, 10))]).optional().nullable(),
  mod2_id: z.union([z.string(), z.number().transform(v => String(v))]).optional().nullable(),
  mod2_lvl: z.union([z.number().int().min(1).max(5), z.string().transform(v => parseInt(v, 10))]).optional().nullable(),
  // Upgrades 2.0 (Sistemas mejorables niveles 0-8 y recursos)
  nivel_fuselaje: z.union([z.number().int().min(0).max(8), z.string().transform(v => parseInt(v, 10))]).optional().default(0),
  nivel_motor: z.union([z.number().int().min(0).max(8), z.string().transform(v => parseInt(v, 10))]).optional().default(0),
  nivel_avionica: z.union([z.number().int().min(0).max(8), z.string().transform(v => parseInt(v, 10))]).optional().default(0),
  nivel_armas: z.union([z.number().int().min(0).max(8), z.string().transform(v => parseInt(v, 10))]).optional().default(0),
  recursos_piezas: z.union([z.number().int().min(0), z.string().transform(v => parseInt(v, 10))]).optional().default(0),
  recursos_avanzadas: z.union([z.number().int().min(0), z.string().transform(v => parseInt(v, 10))]).optional().default(0)
});

export const UpdatePlaneSystemSchema = z.object({
  sistema: z.enum(['fuselaje', 'motor', 'avionica', 'armas']),
  nivel: z.number().int().min(0).max(8),
  piezas: z.number().int().min(0).optional().default(0),
  avanzadas: z.number().int().min(0).optional().default(0)
});

export const ProfileUpdateSchema = z.object({
  nick: z.string().min(2).max(50).optional(),
  full_name: z.string().max(100).optional().nullable(),
  email_personal: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().max(30).optional().nullable(),
  callsign: z.string().max(50).optional().nullable(),
  discord: z.string().max(50).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  notifications_enabled: z.boolean().optional()
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

export const PlaneModelSchema = z.object({
  id: z.union([z.string().min(1, 'El ID del modelo es obligatorio'), z.number().transform(v => String(v))]),
  name: z.string().min(2, 'El nombre del avión es obligatorio'),
  type: z.string().min(2, 'El tipo de avión es obligatorio'),
  special_name: z.string().optional().nullable(),
  special_levels: z.union([z.record(z.any()), z.array(z.any()), z.string()]).optional().nullable(),
  passive_name: z.string().optional().nullable(),
  passive_levels: z.union([z.record(z.any()), z.array(z.any()), z.string()]).optional().nullable(),
  is_active: z.boolean().optional().default(true),
  stats_real: z.union([z.record(z.any()), z.string()]).optional().nullable(),
  sistemas_disponibles: z.union([z.record(z.any()), z.array(z.any()), z.string()]).optional().nullable()
});

