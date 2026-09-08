/**
 * PARAGUAY-FFAA | METALSTORM v2.0 — settings.js
 * Módulo: Configuración de usuario
 * Ubicación: /js/settings.js
 *
 * Gestiona: Temas, Idioma, Notificaciones
 * Persistencia: Supabase tabla `user_settings` vía API
 * Fallback: localStorage para aplicación inmediata offline
 */

// ============================================================
//  ESTADO LOCAL DE CONFIGURACIÓN
// ============================================================
let userSettings = {
  theme:               'militar',   // 'militar' | 'ops'
  language:            'es',        // 'es' | 'en' | 'pt'
  notif_email:         false,
  notif_whatsapp:      false,
  notif_status:        true,
  notif_reminder:      true,
  notif_announcements: true
};

// ============================================================
//  DICCIONARIO i18n
// ============================================================
const I18N = {
  es: {
    'settings.title':                       '⚙️ Configuración',
    'settings.theme.title':                 '🎨 Tema Visual',
    'settings.theme.desc':                  'Seleccioná el esquema de colores de la interfaz. El cambio se aplica de inmediato.',
    'settings.theme.default':               'Predeterminado',
    'settings.theme.new':                   'Nuevo',
    'settings.theme.classic':               'Clásico',
    'settings.lang.title':                  '🌐 Idioma de la Interfaz',
    'settings.lang.desc':                   'Seleccioná el idioma de la interfaz.',
    'settings.notif.title':                 '🔔 Notificaciones',
    'settings.notif.desc':                  'Configurá cómo y cuándo recibís alertas del escuadrón.',
    'settings.notif.email':                 'Email',
    'settings.notif.email_desc':            'Alertas de estado, recordatorios y anuncios',
    'settings.notif.whatsapp':              'WhatsApp',
    'settings.notif.whatsapp_desc':         'Mensajes para cambios críticos de estado',
    'settings.notif.status_alert':          'Alerta de cambio de estado',
    'settings.notif.status_alert_desc':     'Aviso inmediato si tu estado cambia a ROJO o NEGRO',
    'settings.notif.reminder':              'Recordatorio semanal',
    'settings.notif.reminder_desc':         'Aviso los miércoles para ingresar rendimiento',
    'settings.notif.announcements':         'Anuncios del escuadrón',
    'settings.notif.announcements_desc':    'Novedades, eventos y comunicados oficiales',
    'settings.notif.no_contact':            'Para recibir notificaciones, completá tu email y/o teléfono en',
    'settings.notif.profile_link':          'Mi Perfil',
    'settings.save':                        '💾 Guardar Configuración',
    'settings.reset':                       '🔄 Restaurar predeterminados',
    'settings.saved_ok':                    '✅ Configuración guardada correctamente',
    'settings.saved_error':                 '❌ Error al guardar la configuración',
    'settings.reset_ok':                    '🔄 Configuración restablecida'
  },
  en: {
    'settings.title':                       '⚙️ Settings',
    'settings.theme.title':                 '🎨 Visual Theme',
    'settings.theme.desc':                  'Select the color scheme for the interface. Changes apply immediately.',
    'settings.theme.default':               'Default',
    'settings.theme.new':                   'New',
    'settings.theme.classic':               'Classic',
    'settings.lang.title':                  '🌐 Interface Language',
    'settings.lang.desc':                   'Select the interface language.',
    'settings.notif.title':                 '🔔 Notifications',
    'settings.notif.desc':                  'Configure how and when you receive squadron alerts.',
    'settings.notif.email':                 'Email',
    'settings.notif.email_desc':            'Status alerts, reminders and announcements',
    'settings.notif.whatsapp':              'WhatsApp',
    'settings.notif.whatsapp_desc':         'Direct messages for critical status changes',
    'settings.notif.status_alert':          'Status change alert',
    'settings.notif.status_alert_desc':     'Immediate notice if your status changes to RED or BLACK',
    'settings.notif.reminder':              'Weekly reminder',
    'settings.notif.reminder_desc':         'Reminder on Wednesdays to enter your performance',
    'settings.notif.announcements':         'Squadron announcements',
    'settings.notif.announcements_desc':    'News, events and official communications',
    'settings.notif.no_contact':            'To receive notifications, complete your email and/or phone in',
    'settings.notif.profile_link':          'My Profile',
    'settings.save':                        '💾 Save Settings',
    'settings.reset':                       '🔄 Restore defaults',
    'settings.saved_ok':                    '✅ Settings saved successfully',
    'settings.saved_error':                 '❌ Error saving settings',
    'settings.reset_ok':                    '🔄 Settings restored'
  },
  pt: {
    'settings.title':                       '⚙️ Configurações',
    'settings.theme.title':                 '🎨 Tema Visual',
    'settings.theme.desc':                  'Selecione o esquema de cores da interface. A mudança é aplicada imediatamente.',
    'settings.theme.default':               'Padrão',
    'settings.theme.new':                   'Novo',
    'settings.theme.classic':               'Clássico',
    'settings.lang.title':                  '🌐 Idioma da Interface',
    'settings.lang.desc':                   'Selecione o idioma da interface.',
    'settings.notif.title':                 '🔔 Notificações',
    'settings.notif.desc':                  'Configure como e quando você recebe alertas do esquadrão.',
    'settings.notif.email':                 'Email',
    'settings.notif.email_desc':            'Alertas de status, lembretes e anúncios',
    'settings.notif.whatsapp':              'WhatsApp',
    'settings.notif.whatsapp_desc':         'Mensagens para mudanças críticas de status',
    'settings.notif.status_alert':          'Alerta de mudança de status',
    'settings.notif.status_alert_desc':     'Aviso imediato se o seu status mudar para VERMELHO ou PRETO',
    'settings.notif.reminder':              'Lembrete semanal',
    'settings.notif.reminder_desc':         'Aviso nas quartas-feiras para inserir rendimento',
    'settings.notif.announcements':         'Anúncios do esquadrão',
    'settings.notif.announcements_desc':    'Novidades, eventos e comunicados oficiais',
    'settings.notif.no_contact':            'Para receber notificações, complete seu email e/ou telefone em',
    'settings.notif.profile_link':          'Meu Perfil',
    'settings.save':                        '💾 Salvar Configurações',
    'settings.reset':                       '🔄 Restaurar padrões',
    'settings.saved_ok':                    '✅ Configurações salvas com sucesso',
    'settings.saved_error':                 '❌ Erro ao salvar configurações',
    'settings.reset_ok':                    '🔄 Configurações restauradas'
  }
};

// ============================================================
//  TEMAS CSS
// ============================================================
const THEMES = {
  militar: {
    '--bg-gradient-start':    '#1a2a4a',
    '--bg-gradient-end':      '#0d1b2a',
    '--color-primary':        '#1a3a6c',
    '--color-secondary':      '#d4af37',
    '--color-dark':           '#212529',
    '--color-light':          '#f8f9fa',
    '--card-bg':              'rgba(26, 58, 108, 0.3)',
    '--card-border':          '#3a4b6c',
    '--input-bg':             '#2a3b5c',
    '--scrollbar-thumb':      '#d4af37',
    '--nav-btn-active-bg':    '#d4af37',
    '--nav-btn-active-color': '#212529',
    '--nav-btn-hover-bg':     '#d4af37',
    '--nav-btn-hover-color':  '#212529',
    '--header-border':        '#d4af37'
  },
  ops: {
    '--bg-gradient-start':    '#0a0f0d',
    '--bg-gradient-end':      '#060b08',
    '--color-primary':        '#0d2918',
    '--color-secondary':      '#00ff88',
    '--color-dark':           '#0a0f0d',
    '--color-light':          '#e0ffe0',
    '--card-bg':              'rgba(0, 255, 136, 0.04)',
    '--card-border':          '#0d3d20',
    '--input-bg':             '#0d2918',
    '--scrollbar-thumb':      '#00ff88',
    '--nav-btn-active-bg':    '#00ff88',
    '--nav-btn-active-color': '#0a0f0d',
    '--nav-btn-hover-bg':     '#00cc6a',
    '--nav-btn-hover-color':  '#0a0f0d',
    '--header-border':        '#00ff88'
  },
  // ── TEMA CLÁSICO — fiel al PARAGUAY-FFAA | METALSTORM v1 (index-monitor) ──
  // Fondo claro · Cards blancas · Azul #0038A8 · Rojo #D0021B solo detalles
  clasico: {
    '--bg-gradient-start':    '#eef1f7',
    '--bg-gradient-end':      '#f8f9fa',
    '--color-primary':        '#0038A8',   // Azul Paraguay
    '--color-secondary':      '#D0021B',   // Rojo — SOLO detalles
    '--color-dark':           '#212529',   // Texto oscuro sobre fondo claro
    '--color-light':          '#f8f9fa',
    '--card-bg':              '#ffffff',
    '--card-border':          '#d0d8e8',
    '--input-bg':             '#ffffff',
    '--scrollbar-thumb':      '#0038A8',
    '--nav-btn-active-bg':    '#0038A8',
    '--nav-btn-active-color': '#ffffff',
    '--nav-btn-hover-bg':     '#0038A8',
    '--nav-btn-hover-color':  '#ffffff',
    '--header-border':        '#D0021B'
  }
};

// ============================================================
//  CARGAR CONFIGURACIÓN (llamado desde views.js -> loadSettings)
// ============================================================
async function loadSettings() {
  if (!currentUser) return;

  try {
    const res = await fetch(`${API_BASE}/api/settings/me`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();

    if (data.settings) {
      userSettings = { ...userSettings, ...data.settings };
    }
  } catch (err) {
    // Fallback a localStorage si la API falla
    const cached = localStorage.getItem('userSettings');
    if (cached) {
      try { userSettings = { ...userSettings, ...JSON.parse(cached) }; } catch(_) {}
    }
    console.warn('Settings: usando caché local', err);
  }

  applySettingsToUI();
  applyTheme(userSettings.theme);
  applyLanguage(userSettings.language);
  checkNotifContactWarning();
}

// ============================================================
//  APLICAR ESTADO AL FORMULARIO
// ============================================================
function applySettingsToUI() {
  // Tema
  selectTheme(userSettings.theme, false);

  // Idioma
  selectLang(userSettings.language, false);

  // Notificaciones
  ['email', 'whatsapp', 'status', 'reminder', 'announcements'].forEach(key => {
    const el = document.getElementById(`notif_${key}`);
    if (el) el.checked = !!userSettings[`notif_${key}`];
  });
}

// ============================================================
//  SELECCIÓN DE TEMA
// ============================================================
function selectTheme(theme, applyNow = true) {
  userSettings.theme = theme;

  // Actualizar UI de tarjetas
  document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('.theme-check').forEach(c => c.textContent = '');

  const card  = document.getElementById(`theme-card-${theme}`);
  const check = document.getElementById(`check-${theme}`);
  if (card)  card.classList.add('selected');
  if (check) check.textContent = '✓';

  if (applyNow) applyTheme(theme);
}

function applyTheme(theme) {
  const vars = THEMES[theme] || THEMES.militar;
  const root = document.documentElement;

  Object.entries(vars).forEach(([prop, val]) => {
    root.style.setProperty(prop, val);
  });

  // Actualizar background del body
  document.body.style.background = `linear-gradient(135deg, ${vars['--bg-gradient-start']} 0%, ${vars['--bg-gradient-end']} 100%)`;

  // Marcar data-theme en <body> para overrides CSS de texto/contraste
  document.body.setAttribute('data-theme', theme);

  localStorage.setItem('activeTheme', theme);
}

// ============================================================
//  SELECCIÓN DE IDIOMA
// ============================================================
function selectLang(lang, updateUI = true) {
  userSettings.language = lang;

  // Actualizar UI de tarjetas
  document.querySelectorAll('.lang-card').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('.lang-check').forEach(c => c.textContent = '');

  const card  = document.getElementById(`lang-card-${lang}`);
  const check = document.getElementById(`check-lang-${lang}`);
  if (card)  card.classList.add('selected');
  if (check) check.textContent = '✓';

  if (updateUI) applyLanguage(lang);
}

function applyLanguage(lang) {
  const dict = I18N[lang] || I18N.es;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });
  document.documentElement.lang = lang;
  localStorage.setItem('activeLanguage', lang);
}

// ============================================================
//  NOTIFICACIONES
// ============================================================
function updateNotifState() {
  ['email', 'whatsapp', 'status', 'reminder', 'announcements'].forEach(key => {
    const el = document.getElementById(`notif_${key}`);
    if (el) userSettings[`notif_${key}`] = el.checked;
  });
  checkNotifContactWarning();
}

function checkNotifContactWarning() {
  const warning = document.getElementById('notifWarning');
  if (!warning || !currentUser) return;

  const anyActive = userSettings.notif_email || userSettings.notif_whatsapp;
  const hasContact = (currentUser.personal_email || currentUser.phone);

  warning.style.display = (anyActive && !hasContact) ? 'block' : 'none';
}

// ============================================================
//  GUARDAR EN SUPABASE
// ============================================================
async function saveUserSettings() {
  if (!currentUser) return;

  try {
    const res = await fetch(`${API_BASE}/api/settings/me`, {
      method:  'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body:    JSON.stringify(userSettings)
    });
    const data = await res.json();

    if (data.success) {
      localStorage.setItem('userSettings', JSON.stringify(userSettings));
      showToast(I18N[userSettings.language]?.['settings.saved_ok'] || '✅ Configuración guardada', 'success');
    } else {
      showToast(I18N[userSettings.language]?.['settings.saved_error'] || '❌ Error al guardar', 'error');
    }
  } catch (err) {
    // Guardar solo en localStorage si la API no responde
    localStorage.setItem('userSettings', JSON.stringify(userSettings));
    showToast('⚠️ Guardado localmente (sin conexión)', 'warning');
    console.error('Error guardando settings:', err);
  }
}

// ============================================================
//  RESTABLECER PREDETERMINADOS
// ============================================================
function resetSettings() {
  userSettings = {
    theme:               'militar',
    language:            'es',
    notif_email:         false,
    notif_whatsapp:      false,
    notif_status:        true,
    notif_reminder:      true,
    notif_announcements: true
  };

  applySettingsToUI();
  applyTheme('militar');
  applyLanguage('es');
  showToast('🔄 Configuración restablecida', 'info');
}

// ============================================================
//  INICIALIZACIÓN AUTOMÁTICA AL ARRANCAR LA APP
//  (aplica tema e idioma guardados sin abrir la vista de Settings)
// ============================================================
function initSettingsOnLoad() {
  const savedTheme = localStorage.getItem('activeTheme');
  const savedLang  = localStorage.getItem('activeLanguage');
  const savedFull  = localStorage.getItem('userSettings');

  if (savedFull) {
    try { userSettings = { ...userSettings, ...JSON.parse(savedFull) }; } catch(_) {}
  }

  applyTheme(savedTheme || userSettings.theme);
  applyLanguage(savedLang || userSettings.language);
}

// Exponer globalmente en window
window.loadSettings = loadSettings;
window.saveUserSettings = saveUserSettings;
window.resetSettings = resetSettings;
window.initSettingsOnLoad = initSettingsOnLoad;
window.applyTheme = applyTheme;
window.applyLanguage = applyLanguage;
