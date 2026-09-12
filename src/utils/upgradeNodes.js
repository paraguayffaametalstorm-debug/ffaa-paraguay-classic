/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM - UPGRADE NODES HELPER v3.8.0
 * Árbol completo de Nodos de Upgrades 2.0 (108 nodos: 9 sistemas x 12 nodos)
 * ============================================================================
 */

import { getSupabase } from '../db/supabase.js';

// Cache en memoria con TTL de 5 minutos
let cachedNodes = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * 108 nodos oficiales hardcodeados como fallback
 */
const RAW_FALLBACK_NODES = [
  // ── 1. FUSELAJE (12 NODOS) ────────────────────────────────────────────────
  { id: 1, sistema: 'fuselaje', nivel: 1, ruta: 'base', node_name: 'Cubierta de aleación de aluminio', effects: { velocidad_total: 2, descripcion: '+2% Velocidad Total' }, requirement_level: 6, cost_piezas: 100, cost_avanzadas: 0 },
  { id: 2, sistema: 'fuselaje', nivel: 2, ruta: 'base', node_name: 'Costillas estructurales de titanio', effects: { vida: 4, descripcion: '+4% Vida' }, requirement_level: 7, cost_piezas: 250, cost_avanzadas: 0 },
  { id: 3, sistema: 'fuselaje', nivel: 3, ruta: 'base', node_name: 'Revestimiento de polímero compuesto', effects: { resistencia_g: 5, descripcion: '+5% Resistencia a Fuerzas G' }, requirement_level: 8, cost_piezas: 500, cost_avanzadas: 10 },
  { id: 4, sistema: 'fuselaje', nivel: 4, ruta: 'base', node_name: 'Mamparos preformados', effects: { vida: 6, resistencia_danio: 3, descripcion: '+6% Vida +3% Resistencia' }, requirement_level: 10, cost_piezas: 800, cost_avanzadas: 25 },
  { id: 5, sistema: 'fuselaje', nivel: 5, ruta: 'A', node_name: 'Celdas de Combustible autosellantes', effects: { vida: 12.5, combustible_quemador_auxiliar: 5, descripcion: '+12.5% Vida +5% Combustible' }, requirement_level: 12, cost_piezas: 1200, cost_avanzadas: 50 },
  { id: 6, sistema: 'fuselaje', nivel: 5, ruta: 'B', node_name: 'Red de palancas acodate', effects: { respuesta_giro: -10, descripcion: '-10% Respuesta de Giro' }, requirement_level: 12, cost_piezas: 1200, cost_avanzadas: 50 },
  { id: 7, sistema: 'fuselaje', nivel: 6, ruta: 'A', node_name: 'Placas de blindaje cerámico', effects: { vida: 15, resistencia_criticos: 8, descripcion: '+15% Vida +8% Resist. Críticos' }, requirement_level: 14, cost_piezas: 1800, cost_avanzadas: 100 },
  { id: 8, sistema: 'fuselaje', nivel: 6, ruta: 'B', node_name: 'Actuadores hidráulicos de alta presión', effects: { velocidad_alabeo: 8, tasa_giro: 4, descripcion: '+8% Vel. Alabeo +4% Tasa Giro' }, requirement_level: 14, cost_piezas: 1800, cost_avanzadas: 100 },
  { id: 9, sistema: 'fuselaje', nivel: 7, ruta: 'A', node_name: 'Estructura reticular reforzada', effects: { vida: 18, reduccion_danio_area: 10, descripcion: '+18% Vida +10% Reduc. Daño Área' }, requirement_level: 16, cost_piezas: 2500, cost_avanzadas: 200 },
  { id: 10, sistema: 'fuselaje', nivel: 7, ruta: 'B', node_name: 'Superficies aerodinámicas activas', effects: { aceleracion_maniobra: 10, radio_giro: -8, descripcion: '+10% Acel. Maniobra -8% Radio Giro' }, requirement_level: 16, cost_piezas: 2500, cost_avanzadas: 200 },
  { id: 11, sistema: 'fuselaje', nivel: 8, ruta: 'A', node_name: 'Blindaje reactivo de nanotubos', effects: { vida: 25, integridad_estructural: 15, descripcion: '+25% Vida +15% Integridad Estructural' }, requirement_level: 19, cost_piezas: 3500, cost_avanzadas: 350 },
  { id: 12, sistema: 'fuselaje', nivel: 8, ruta: 'B', node_name: 'Micro-alerones canard adaptativos', effects: { agilidad_suprema: 15, tasa_giro_instantanea: 12, descripcion: '+15% Agilidad +12% Giro Instantáneo' }, requirement_level: 19, cost_piezas: 3500, cost_avanzadas: 350 },

  // ── 2. MOTOR (12 NODOS) ───────────────────────────────────────────────────
  { id: 13, sistema: 'motor', nivel: 1, ruta: 'base', node_name: 'Compresor de flujo axial optimizado', effects: { empuje_seco: 3, descripcion: '+3% Empuje Seco' }, requirement_level: 6, cost_piezas: 100, cost_avanzadas: 0 },
  { id: 14, sistema: 'motor', nivel: 2, ruta: 'base', node_name: 'Inyectores de combustible atomizado', effects: { aceleracion: 4, descripcion: '+4% Aceleración' }, requirement_level: 7, cost_piezas: 250, cost_avanzadas: 0 },
  { id: 15, sistema: 'motor', nivel: 3, ruta: 'base', node_name: 'Tobera de geometría variable', effects: { velocidad_maxima: 3, descripcion: '+3% Velocidad Máxima' }, requirement_level: 8, cost_piezas: 500, cost_avanzadas: 10 },
  { id: 16, sistema: 'motor', nivel: 4, ruta: 'base', node_name: 'Cámara de combustión anular', effects: { empuje_militar: 5, tasa_ascenso: 4, descripcion: '+5% Empuje +4% Tasa Ascenso' }, requirement_level: 10, cost_piezas: 800, cost_avanzadas: 25 },
  { id: 17, sistema: 'motor', nivel: 5, ruta: 'A', node_name: 'Postquemador con matriz catalítica', effects: { velocidad_punta_quemador: 4, aceleracion: 8, descripcion: '+4% Vel. Quemador +8% Aceleración' }, requirement_level: 12, cost_piezas: 1200, cost_avanzadas: 50 },
  { id: 18, sistema: 'motor', nivel: 5, ruta: 'B', node_name: 'Turbina de gas de bajo consumo', effects: { combustible_quemador_auxiliar: 15, tiempo_quemador: 12, descripcion: '+15% Combustible +12% Tiempo Quemador' }, requirement_level: 12, cost_piezas: 1200, cost_avanzadas: 50 },
  { id: 19, sistema: 'motor', nivel: 6, ruta: 'A', node_name: 'Ductos de aire con recubrimiento térmico', effects: { aceleracion: 10, empuje_inmediato: 8, descripcion: '+10% Aceleración +8% Empuje Inmediato' }, requirement_level: 14, cost_piezas: 1800, cost_avanzadas: 100 },
  { id: 20, sistema: 'motor', nivel: 6, ruta: 'B', node_name: 'Sistema de enfriamiento criogénico', effects: { regeneracion_quemador: 15, disipacion_termica: 10, descripcion: '+15% Regen. Quemador +10% Disipación Térmica' }, requirement_level: 14, cost_piezas: 1800, cost_avanzadas: 100 },
  { id: 21, sistema: 'motor', nivel: 7, ruta: 'A', node_name: 'Inyección de agua-metanol', effects: { sobreempuje_emergencia: 12, velocidad_punta_quemador: 6, descripcion: '+12% Sobreempuje +6% Vel. Punta Quemador' }, requirement_level: 16, cost_piezas: 2500, cost_avanzadas: 200 },
  { id: 22, sistema: 'motor', nivel: 7, ruta: 'B', node_name: 'Recirculación de gases asistida', effects: { eficiencia_combustible: 20, velocidad_crucero: 6, descripcion: '+20% Eficiencia +6% Vel. Crucero' }, requirement_level: 16, cost_piezas: 2500, cost_avanzadas: 200 },
  { id: 23, sistema: 'motor', nivel: 8, ruta: 'A', node_name: 'Álabes de superaleación monocristalina', effects: { combustible_quemador_auxiliar: -10, velocidad_punta_quemador: 5, aceleracion: 12.5, descripcion: '-10% Comb. +5% Vel. Punta Quem. +12.5% Acel.' }, requirement_level: 19, cost_piezas: 3500, cost_avanzadas: 350 },
  { id: 24, sistema: 'motor', nivel: 8, ruta: 'B', node_name: 'Ciclo turbofan termodinámico dual', effects: { capacidad_quemador: 25, reserva_empuje: 15, descripcion: '+25% Capacidad Quemador +15% Reserva Empuje' }, requirement_level: 19, cost_piezas: 3500, cost_avanzadas: 350 },

  // ── 3. AVIÓNICA (12 NODOS) ────────────────────────────────────────────────
  { id: 25, sistema: 'avionica', nivel: 1, ruta: 'base', node_name: 'Receptor de alerta radar RWR digital', effects: { alcance_deteccion: 4, descripcion: '+4% Alcance Detección' }, requirement_level: 6, cost_piezas: 100, cost_avanzadas: 0 },
  { id: 26, sistema: 'avionica', nivel: 2, ruta: 'base', node_name: 'Antena de barrido electrónico pasivo', effects: { velocidad_enganche: 5, descripcion: '+5% Velocidad Enganche' }, requirement_level: 7, cost_piezas: 250, cost_avanzadas: 0 },
  { id: 27, sistema: 'avionica', nivel: 3, ruta: 'base', node_name: 'Dispensador chaff/flares automatizado', effects: { recarga_contramedidas: -5, descripcion: '-5% Recarga Contramedidas' }, requirement_level: 8, cost_piezas: 500, cost_avanzadas: 10 },
  { id: 28, sistema: 'avionica', nivel: 4, ruta: 'base', node_name: 'Procesador de señales AESA', effects: { alcance_radar: 8, resolucion_blancos: 6, descripcion: '+8% Alcance Radar +6% Resolución' }, requirement_level: 10, cost_piezas: 800, cost_avanzadas: 25 },
  { id: 29, sistema: 'avionica', nivel: 5, ruta: 'A', node_name: 'Radar AESA de matriz escalonada', effects: { alcance_deteccion: 15, angulo_escaneo: 10, descripcion: '+15% Alcance Detección +10% Ángulo Escaneo' }, requirement_level: 12, cost_piezas: 1200, cost_avanzadas: 50 },
  { id: 30, sistema: 'avionica', nivel: 5, ruta: 'B', node_name: 'Perturbador ECM de banda cruzada', effects: { resistencia_enganche_enemigo: 12, duracion_contramedidas: 10, descripcion: '+12% Resist. Enganche +10% Duración Chaff/Flares' }, requirement_level: 12, cost_piezas: 1200, cost_avanzadas: 50 },
  { id: 31, sistema: 'avionica', nivel: 6, ruta: 'A', node_name: 'Enlace de datos táctico C4ISR', effects: { tiempo_enganche_multiple: -12, rango_seguimiento: 10, descripcion: '-12% Tiempo Enganche +10% Rango Seguimiento' }, requirement_level: 14, cost_piezas: 1800, cost_avanzadas: 100 },
  { id: 32, sistema: 'avionica', nivel: 6, ruta: 'B', node_name: 'Generador de objetivos fantasma DRFM', effects: { probabilidad_evasion_radar: 14, ruptura_bloqueo: 10, descripcion: '+14% Evasión Radar +10% Ruptura Bloqueo' }, requirement_level: 14, cost_piezas: 1800, cost_avanzadas: 100 },
  { id: 33, sistema: 'avionica', nivel: 7, ruta: 'A', node_name: 'Sistema óptico IRST pasivo infrarrojo', effects: { deteccion_sigilosa: 16, precision_adquisicion: 12, descripcion: '+16% Detección Sigilo +12% Precisión' }, requirement_level: 16, cost_piezas: 2500, cost_avanzadas: 200 },
  { id: 34, sistema: 'avionica', nivel: 7, ruta: 'B', node_name: 'Bureteador de chaff de dispersión rápida', effects: { enfriamiento_flares: -15, capacidad_contramedidas: 1, descripcion: '-15% Enfriamiento Flares +1 Carga Contramedidas' }, requirement_level: 16, cost_piezas: 2500, cost_avanzadas: 200 },
  { id: 35, sistema: 'avionica', nivel: 8, ruta: 'A', node_name: 'Fusión de sensores multiespectral', effects: { conciencia_situacional: 20, bloqueo_inmediato: 15, descripcion: '+20% Conciencia Situacional +15% Bloqueo Inmediato' }, requirement_level: 19, cost_piezas: 3500, cost_avanzadas: 350 },
  { id: 36, sistema: 'avionica', nivel: 8, ruta: 'B', node_name: 'Suite de guerra ofensiva cuántica', effects: { cegado_radar_enemigo: 25, inmunidad_ecm: 18, descripcion: '+25% Cegado Radar Enemigo +18% Inmunidad ECM' }, requirement_level: 19, cost_piezas: 3500, cost_avanzadas: 350 },

  // ── 4. CAÑONES PRECISIÓN (12 NODOS) ───────────────────────────────────────
  { id: 37, sistema: 'canones_precision', nivel: 1, ruta: 'base', node_name: 'Cañón rotativo con ánima pulida', effects: { precision_canon: 4, descripcion: '+4% Precisión Cañón' }, requirement_level: 6, cost_piezas: 100, cost_avanzadas: 0 },
  { id: 38, sistema: 'canones_precision', nivel: 2, ruta: 'base', node_name: 'Mecanismo de alimentación eléctrica', effects: { cadencia_fuego: 5, descripcion: '+5% Cadencia Fuego' }, requirement_level: 7, cost_piezas: 250, cost_avanzadas: 0 },
  { id: 39, sistema: 'canones_precision', nivel: 3, ruta: 'base', node_name: 'Disipador de calor ventilado', effects: { tiempo_sobrecalentamiento: 8, descripcion: '+8% Tiempo hasta Sobrecalentamiento' }, requirement_level: 8, cost_piezas: 500, cost_avanzadas: 10 },
  { id: 40, sistema: 'canones_precision', nivel: 4, ruta: 'base', node_name: 'Mira predictiva con telemetría láser', effects: { velocidad_proyectil: 6, agrupacion_disparo: 5, descripcion: '+6% Vel. Proyectil +5% Agrupación' }, requirement_level: 10, cost_piezas: 800, cost_avanzadas: 25 },
  { id: 41, sistema: 'canones_precision', nivel: 5, ruta: 'A', node_name: 'Munición perforante sabot APFSDS', effects: { danio_critico_canon: 15, alcance_efectivo: 12, descripcion: '+15% Daño Crítico +12% Alcance Efectivo' }, requirement_level: 12, cost_piezas: 1200, cost_avanzadas: 50 },
  { id: 42, sistema: 'canones_precision', nivel: 5, ruta: 'B', node_name: 'Motor rotativo de alta tensión', effects: { cadencia_fuego: 12, velocidad_disparo: 8, descripcion: '+12% Cadencia +8% Velocidad Disparo' }, requirement_level: 12, cost_piezas: 1200, cost_avanzadas: 50 },
  { id: 43, sistema: 'canones_precision', nivel: 6, ruta: 'A', node_name: 'Freno de boca compensador de retroceso', effects: { dispersion_balistica: -15, estabilidad_rafaga: 10, descripcion: '-15% Dispersión +10% Estabilidad Ráfaga' }, requirement_level: 14, cost_piezas: 1800, cost_avanzadas: 100 },
  { id: 44, sistema: 'canones_precision', nivel: 6, ruta: 'B', node_name: 'Refrigeración líquida por circuito cerrado', effects: { disipacion_calor: 15, enfriamiento_recamara: 12, descripcion: '+15% Disipación Calor +12% Enfriamiento' }, requirement_level: 14, cost_piezas: 1800, cost_avanzadas: 100 },
  { id: 45, sistema: 'canones_precision', nivel: 7, ruta: 'A', node_name: 'Balas inteligentes con guía de trayectoria', effects: { probabilidad_critico_largo: 18, danio_blindaje: 15, descripcion: '+18% Prob. Crítico +15% Daño Blindaje' }, requirement_level: 16, cost_piezas: 2500, cost_avanzadas: 200 },
  { id: 46, sistema: 'canones_precision', nivel: 7, ruta: 'B', node_name: 'Cargador rotativo de alimentación continua', effects: { capacidad_municion: 20, cadencia_sostenida: 15, descripcion: '+20% Munición +15% Cadencia Sostenida' }, requirement_level: 16, cost_piezas: 2500, cost_avanzadas: 200 },
  { id: 47, sistema: 'canones_precision', nivel: 8, ruta: 'A', node_name: 'Sinfonía de tungsteno hiperbárica', effects: { penetracion_armadura: 25, danio_tiro_quirurgico: 20, descripcion: '+25% Penetración Armadura +20% Daño Quirúrgico' }, requirement_level: 19, cost_piezas: 3500, cost_avanzadas: 350 },
  { id: 48, sistema: 'canones_precision', nivel: 8, ruta: 'B', node_name: 'Torbellino de plomo superconductor', effects: { dps_canon_bruto: 25, tiempo_rafaga: 30, descripcion: '+25% DPS Bruto +30% Tiempo Ráfaga' }, requirement_level: 19, cost_piezas: 3500, cost_avanzadas: 350 },

  // ── 5. CAÑONES ASALTO (12 NODOS) ──────────────────────────────────────────
  { id: 49, sistema: 'canones_asalto', nivel: 1, ruta: 'base', node_name: 'Bocas de fuego reforzadas de asalto', effects: { danio_impacto: 4, descripcion: '+4% Daño de Impacto' }, requirement_level: 6, cost_piezas: 100, cost_avanzadas: 0 },
  { id: 50, sistema: 'canones_asalto', nivel: 2, ruta: 'base', node_name: 'Cinturón de alimentación reforzado', effects: { cadencia_inicial: 5, descripcion: '+5% Cadencia Inicial' }, requirement_level: 7, cost_piezas: 250, cost_avanzadas: 0 },
  { id: 51, sistema: 'canones_asalto', nivel: 3, ruta: 'base', node_name: 'Chaqueta de refrigeración por aire forzado', effects: { recuperacion_recalentamiento: 8, descripcion: '+8% Recuperación Sobrecalentamiento' }, requirement_level: 8, cost_piezas: 500, cost_avanzadas: 10 },
  { id: 52, sistema: 'canones_asalto', nivel: 4, ruta: 'base', node_name: 'Compensador de retroceso pesado', effects: { control_rafaga: 6, danio_cercano: 6, descripcion: '+6% Control Ráfaga +6% Daño Cercano' }, requirement_level: 10, cost_piezas: 800, cost_avanzadas: 25 },
  { id: 53, sistema: 'canones_asalto', nivel: 5, ruta: 'A', node_name: 'Proyectiles de uranio empobrecido', effects: { danio_blindaje_pesado: 16, danio_por_segundo: 10, descripcion: '+16% Daño Blindaje Pesado +10% DPS' }, requirement_level: 12, cost_piezas: 1200, cost_avanzadas: 50 },
  { id: 54, sistema: 'canones_asalto', nivel: 5, ruta: 'B', node_name: 'Expulsor rotativo de alta cadencia', effects: { cadencia_fuego: 15, dispersion_cercana: 8, descripcion: '+15% Cadencia +8% Área Cobertura' }, requirement_level: 12, cost_piezas: 1200, cost_avanzadas: 50 },
  { id: 55, sistema: 'canones_asalto', nivel: 6, ruta: 'A', node_name: 'Cámara de ignición presurizada', effects: { velocidad_boca: 10, impacto_estructural: 12, descripcion: '+10% Vel. Salida +12% Impacto Estructural' }, requirement_level: 14, cost_piezas: 1800, cost_avanzadas: 100 },
  { id: 56, sistema: 'canones_asalto', nivel: 6, ruta: 'B', node_name: 'Recubrimiento antifricción cerámico', effects: { duracion_fuego_continuo: 18, reduccion_calor: 12, descripcion: '+18% Fuego Continuo -12% Calor' }, requirement_level: 14, cost_piezas: 1800, cost_avanzadas: 100 },
  { id: 57, sistema: 'canones_asalto', nivel: 7, ruta: 'A', node_name: 'Munición de fragmentación explosiva HEI', effects: { danio_area_impacto: 18, efecto_aturdimiento: 14, descripcion: '+18% Daño Fragmentación +14% Aturdimiento' }, requirement_level: 16, cost_piezas: 2500, cost_avanzadas: 200 },
  { id: 58, sistema: 'canones_asalto', nivel: 7, ruta: 'B', node_name: 'Alimentación neumática ultra-rápida', effects: { velocidad_recarga_cinta: 20, rafaga_maxima: 15, descripcion: '+20% Recarga Cinta +15% Ráfaga Máxima' }, requirement_level: 16, cost_piezas: 2500, cost_avanzadas: 200 },
  { id: 59, sistema: 'canones_asalto', nivel: 8, ruta: 'A', node_name: 'Coloso balístico demoledor', effects: { destruccion_instantanea_armadura: 26, danio_bruto_asalto: 22, descripcion: '+26% Destrucción Armadura +22% Daño Asalto' }, requirement_level: 19, cost_piezas: 3500, cost_avanzadas: 350 },
  { id: 60, sistema: 'canones_asalto', nivel: 8, ruta: 'B', node_name: 'Muro de fuego ininterrumpido', effects: { densidad_disparo_suprema: 28, supresion_aerea: 20, descripcion: '+28% Densidad Disparo +20% Supresión Aérea' }, requirement_level: 19, cost_piezas: 3500, cost_avanzadas: 350 },

  // ── 6. MISILES IR (12 NODOS) ──────────────────────────────────────────────
  { id: 61, sistema: 'misiles_ir', nivel: 1, ruta: 'base', node_name: 'Sensor térmico de seleniuro de plomo', effects: { sensibilidad_termica: 4, descripcion: '+4% Sensibilidad Térmica' }, requirement_level: 6, cost_piezas: 100, cost_avanzadas: 0 },
  { id: 62, sistema: 'misiles_ir', nivel: 2, ruta: 'base', node_name: 'Aletas canard de respuesta rápida', effects: { maniobrabilidad_misil: 5, descripcion: '+5% Maniobrabilidad Misil' }, requirement_level: 7, cost_piezas: 250, cost_avanzadas: 0 },
  { id: 63, sistema: 'misiles_ir', nivel: 3, ruta: 'base', node_name: 'Motor cohete de combustible sólido rápido', effects: { aceleracion_misil: 6, descripcion: '+6% Aceleración Misil' }, requirement_level: 8, cost_piezas: 500, cost_avanzadas: 10 },
  { id: 64, sistema: 'misiles_ir', nivel: 4, ruta: 'base', node_name: 'Algoritmo de seguimiento proactivo', effects: { resistencia_flares: 8, velocidad_enganche: 6, descripcion: '+8% Resist. Flares +6% Vel. Enganche' }, requirement_level: 10, cost_piezas: 800, cost_avanzadas: 25 },
  { id: 65, sistema: 'misiles_ir', nivel: 5, ruta: 'A', node_name: 'Sensor infrarrojo de doble espectro', effects: { resistencia_flares: 15, angulo_enganche_off_boresight: 12, descripcion: '+15% Resist. Flares +12% Ángulo Off-Boresight' }, requirement_level: 12, cost_piezas: 1200, cost_avanzadas: 50 },
  { id: 66, sistema: 'misiles_ir', nivel: 5, ruta: 'B', node_name: 'Cabeza de guerra con varillas continuas', effects: { danio_impacto_misil: 14, radio_explosion: 8, descripcion: '+14% Daño Impacto +8% Radio Explosión' }, requirement_level: 12, cost_piezas: 1200, cost_avanzadas: 50 },
  { id: 67, sistema: 'misiles_ir', nivel: 6, ruta: 'A', node_name: 'Vectorización de empuje en tobera de misil', effects: { tasa_giro_misil: 16, persecucion_cerrada: 12, descripcion: '+16% Tasa Giro Misil +12% Persecución Cerrada' }, requirement_level: 14, cost_piezas: 1800, cost_avanzadas: 100 },
  { id: 68, sistema: 'misiles_ir', nivel: 6, ruta: 'B', node_name: 'Propulsor de quemado prolongado', effects: { alcance_maximo_ir: 15, energia_terminal: 10, descripcion: '+15% Alcance Máximo +10% Energía Terminal' }, requirement_level: 14, cost_piezas: 1800, cost_avanzadas: 100 },
  { id: 69, sistema: 'misiles_ir', nivel: 7, ruta: 'A', node_name: 'Matriz de imagen térmica IIR', effects: { inmunidad_contramedidas_termicas: 18, tiempo_reenganche: -15, descripcion: '+18% Inmunidad Flares -15% Tiempo Reenganche' }, requirement_level: 16, cost_piezas: 2500, cost_avanzadas: 200 },
  { id: 70, sistema: 'misiles_ir', nivel: 7, ruta: 'B', node_name: 'Espoleta de proximidad láser activa', effects: { probabilidad_impacto_letal: 20, danio_critico_misil: 15, descripcion: '+20% Prob. Impacto Letal +15% Daño Crítico' }, requirement_level: 16, cost_piezas: 2500, cost_avanzadas: 200 },
  { id: 71, sistema: 'misiles_ir', nivel: 8, ruta: 'A', node_name: 'Ojo de víbora omnipresente', effects: { enganche_360_grados: 25, agilidad_misil_suprema: 22, descripcion: '+25% Capacidad 360° +22% Agilidad Extrema' }, requirement_level: 19, cost_piezas: 3500, cost_avanzadas: 350 },
  { id: 72, sistema: 'misiles_ir', nivel: 8, ruta: 'B', node_name: 'Aniquilador termobárico de proximidad', effects: { danio_aniquilacion_ir: 28, fragmentacion_letal: 20, descripcion: '+28% Daño Aniquilación +20% Fragmentación Letal' }, requirement_level: 19, cost_piezas: 3500, cost_avanzadas: 350 },

  // ── 7. COHETES (12 NODOS) ─────────────────────────────────────────────────
  { id: 73, sistema: 'cohetes', nivel: 1, ruta: 'base', node_name: 'Pods aerodinámicos de baja resistencia', effects: { velocidad_vuelo_cohete: 4, descripcion: '+4% Velocidad Vuelo' }, requirement_level: 6, cost_piezas: 100, cost_avanzadas: 0 },
  { id: 74, sistema: 'cohetes', nivel: 2, ruta: 'base', node_name: 'Carga propulsora de combustión uniforme', effects: { alcance_trayectoria: 5, descripcion: '+5% Alcance Trayectoria' }, requirement_level: 7, cost_piezas: 250, cost_avanzadas: 0 },
  { id: 75, sistema: 'cohetes', nivel: 3, ruta: 'base', node_name: 'Estabilizadores de cola plegables', effects: { agrupamiento_salva: 8, descripcion: '+8% Agrupamiento de Salva' }, requirement_level: 8, cost_piezas: 500, cost_avanzadas: 10 },
  { id: 76, sistema: 'cohetes', nivel: 4, ruta: 'base', node_name: 'Dispensador de ignición rápida', effects: { cadencia_salva: 8, danio_area: 5, descripcion: '+8% Cadencia Salva +5% Daño Área' }, requirement_level: 10, cost_piezas: 800, cost_avanzadas: 25 },
  { id: 77, sistema: 'cohetes', nivel: 5, ruta: 'A', node_name: 'Pods de gran capacidad de carga', effects: { cantidad_cohetes_pod: 20, tiempo_recarga: -10, descripcion: '+20% Capacidad Pod -10% Tiempo Recarga' }, requirement_level: 12, cost_piezas: 1200, cost_avanzadas: 50 },
  { id: 78, sistema: 'cohetes', nivel: 5, ruta: 'B', node_name: 'Cabezas huecas antitanque HEAT', effects: { danio_impacto_directo: 18, penetracion_blindaje: 12, descripcion: '+18% Daño Directo +12% Penetración' }, requirement_level: 12, cost_piezas: 1200, cost_avanzadas: 50 },
  { id: 79, sistema: 'cohetes', nivel: 6, ruta: 'A', node_name: 'Ignición secuencial en abanico', effects: { cobertura_salva: 15, densidad_fuego_cohetes: 12, descripcion: '+15% Cobertura Salva +12% Densidad Fuego' }, requirement_level: 14, cost_piezas: 1800, cost_avanzadas: 100 },
  { id: 80, sistema: 'cohetes', nivel: 6, ruta: 'B', node_name: 'Punta de balasto balístico denso', effects: { velocidad_impacto: 15, precision_impacto: 12, descripcion: '+15% Vel. Impacto +12% Precisión' }, requirement_level: 14, cost_piezas: 1800, cost_avanzadas: 100 },
  { id: 81, sistema: 'cohetes', nivel: 7, ruta: 'A', node_name: 'Espoletas de fragmentación de choque', effects: { radio_explosion_cohete: 20, efecto_onda_expansiva: 15, descripcion: '+20% Radio Explosión +15% Onda Expansiva' }, requirement_level: 16, cost_piezas: 2500, cost_avanzadas: 200 },
  { id: 82, sistema: 'cohetes', nivel: 7, ruta: 'B', node_name: 'Micro-guía por aletas inerciales', effects: { correccion_vuelo: 18, desviacion_viento: -15, descripcion: '+18% Corrección Vuelo -15% Desviación' }, requirement_level: 16, cost_piezas: 2500, cost_avanzadas: 200 },
  { id: 83, sistema: 'cohetes', nivel: 8, ruta: 'A', node_name: 'Tormenta de fuego devastadora', effects: { destruccion_area_masiva: 28, danio_continuo_salva: 22, descripcion: '+28% Destrucción Masiva +22% Daño Salva' }, requirement_level: 19, cost_piezas: 3500, cost_avanzadas: 350 },
  { id: 84, sistema: 'cohetes', nivel: 8, ruta: 'B', node_name: 'Punta de lanza cinética absoluta', effects: { perforacion_blindaje_total: 30, impacto_quirurgico: 24, descripcion: '+30% Perforación Total +24% Impacto Quirúrgico' }, requirement_level: 19, cost_piezas: 3500, cost_avanzadas: 350 },

  // ── 8. MISILES MANUAL (12 NODOS) ──────────────────────────────────────────
  { id: 85, sistema: 'misiles_manual', nivel: 1, ruta: 'base', node_name: 'Giroscopio inercial de alta estabilidad', effects: { estabilidad_guia: 4, descripcion: '+4% Estabilidad de Guía' }, requirement_level: 6, cost_piezas: 100, cost_avanzadas: 0 },
  { id: 86, sistema: 'misiles_manual', nivel: 2, ruta: 'base', node_name: 'Enlace de comandos de radio codificado', effects: { respuesta_controles: 5, descripcion: '+5% Respuesta a Controles' }, requirement_level: 7, cost_piezas: 250, cost_avanzadas: 0 },
  { id: 87, sistema: 'misiles_manual', nivel: 3, ruta: 'base', node_name: 'Bengala de cola de alto brillo', effects: { visibilidad_trazador: 8, descripcion: '+8% Visibilidad de Trazador' }, requirement_level: 8, cost_piezas: 500, cost_avanzadas: 10 },
  { id: 88, sistema: 'misiles_manual', nivel: 4, ruta: 'base', node_name: 'Servomotores de aletas de alta torsión', effects: { agilidad_manual: 7, velocidad_vuelo: 5, descripcion: '+7% Agilidad Manual +5% Velocidad' }, requirement_level: 10, cost_piezas: 800, cost_avanzadas: 25 },
  { id: 89, sistema: 'misiles_manual', nivel: 5, ruta: 'A', node_name: 'Filtro óptico con zoom de precisión', effects: { precision_apuntado_manual: 16, correccion_fina: 12, descripcion: '+16% Precisión Apuntado +12% Corrección Fina' }, requirement_level: 12, cost_piezas: 1200, cost_avanzadas: 50 },
  { id: 90, sistema: 'misiles_manual', nivel: 5, ruta: 'B', node_name: 'Ojiva de fragmentación de alto poder', effects: { danio_impacto: 16, radio_danio: 10, descripcion: '+16% Daño Impacto +10% Radio Daño' }, requirement_level: 12, cost_piezas: 1200, cost_avanzadas: 50 },
  { id: 91, sistema: 'misiles_manual', nivel: 6, ruta: 'A', node_name: 'Compensador dinámico de turbulencia', effects: { resistencia_desviacion: 16, agilidad_angulo_agudo: 12, descripcion: '+16% Resist. Desviación +12% Maniobra Ángulo Agudo' }, requirement_level: 14, cost_piezas: 1800, cost_avanzadas: 100 },
  { id: 92, sistema: 'misiles_manual', nivel: 6, ruta: 'B', node_name: 'Propulsor de combustión acelerada', effects: { aceleracion_terminal: 15, energia_choque: 12, descripcion: '+15% Acel. Terminal +12% Energía Choque' }, requirement_level: 14, cost_piezas: 1800, cost_avanzadas: 100 },
  { id: 93, sistema: 'misiles_manual', nivel: 7, ruta: 'A', node_name: 'Canal de datos bidireccional digital', effects: { latencia_comando: -25, retencion_blanco: 15, descripcion: '-25% Latencia Comando +15% Retención Blanco' }, requirement_level: 16, cost_piezas: 2500, cost_avanzadas: 200 },
  { id: 94, sistema: 'misiles_manual', nivel: 7, ruta: 'B', node_name: 'Espoleta de impacto retardado antiblindaje', effects: { danio_penetracion: 20, danio_critico_componentes: 16, descripcion: '+20% Daño Penetración +16% Daño Crítico' }, requirement_level: 16, cost_piezas: 2500, cost_avanzadas: 200 },
  { id: 95, sistema: 'misiles_manual', nivel: 8, ruta: 'A', node_name: 'Guía sináptica teledirigida', effects: { precision_milimetrica: 28, inmunidad_interferencia_manual: 22, descripcion: '+28% Precisión Milimétrica +22% Inmunidad Jamming' }, requirement_level: 19, cost_piezas: 3500, cost_avanzadas: 350 },
  { id: 96, sistema: 'misiles_manual', nivel: 8, ruta: 'B', node_name: 'Ojiva nuclear táctica condensada', effects: { poder_destructivo_bruto: 30, radio_aniquilacion: 25, descripcion: '+30% Poder Destructivo +25% Radio Aniquilación' }, requirement_level: 19, cost_piezas: 3500, cost_avanzadas: 350 },

  // ── 9. MISILES RADAR (12 NODOS) ───────────────────────────────────────────
  { id: 97, sistema: 'misiles_radar', nivel: 1, ruta: 'base', node_name: 'Buscador de radar pasivo / semi-activo', effects: { sensibilidad_radar_misil: 4, descripcion: '+4% Sensibilidad Radar' }, requirement_level: 6, cost_piezas: 100, cost_avanzadas: 0 },
  { id: 98, sistema: 'misiles_radar', nivel: 2, ruta: 'base', node_name: 'Receptor doppler para blancos en vuelo bajo', effects: { rechazo_ecos_tierra: 5, descripcion: '+5% Rechazo Ecos de Tierra' }, requirement_level: 7, cost_piezas: 250, cost_avanzadas: 0 },
  { id: 99, sistema: 'misiles_radar', nivel: 3, ruta: 'base', node_name: 'Motor estatorreactor ramjet de sustentación', effects: { retencion_velocidad_larga: 6, descripcion: '+6% Retención Velocidad' }, requirement_level: 8, cost_piezas: 500, cost_avanzadas: 10 },
  { id: 100, sistema: 'misiles_radar', nivel: 4, ruta: 'base', node_name: 'Piloto automático de navegación proporcional', effects: { alcance_efectivo_radar: 8, eficiencia_trayectoria: 6, descripcion: '+8% Alcance +6% Eficiencia Trayectoria' }, requirement_level: 10, cost_piezas: 800, cost_avanzadas: 25 },
  { id: 101, sistema: 'misiles_radar', nivel: 5, ruta: 'A', node_name: 'Buscador de radar activo ARH autónomo', effects: { alcance_bvr: 18, capacidad_dispara_y_olvida: 14, descripcion: '+18% Alcance BVR +14% Capacidad Fire-and-Forget' }, requirement_level: 12, cost_piezas: 1200, cost_avanzadas: 50 },
  { id: 102, sistema: 'misiles_radar', nivel: 5, ruta: 'B', node_name: 'Procesador de contra-contramedidas ECCM', effects: { resistencia_chaff_ecm: 16, reenganche_autonomo: 12, descripcion: '+16% Resist. Chaff/ECM +12% Reenganche Autónomo' }, requirement_level: 12, cost_piezas: 1200, cost_avanzadas: 50 },
  { id: 103, sistema: 'misiles_radar', nivel: 6, ruta: 'A', node_name: 'Enlace de actualización a medio camino', effects: { precision_medio_camino: 15, correccion_blanco_maniobrando: 12, descripcion: '+15% Precisión Trayectoria +12% Blanco Maniobrando' }, requirement_level: 14, cost_piezas: 1800, cost_avanzadas: 100 },
  { id: 104, sistema: 'misiles_radar', nivel: 6, ruta: 'B', node_name: 'Modo de rastreo sobre emisión Home-on-Jam', effects: { efectividad_contra_jamming: 18, velocidad_enganche_ecm: 14, descripcion: '+18% Modo Home-on-Jam +14% Vel. Enganche' }, requirement_level: 14, cost_piezas: 1800, cost_avanzadas: 100 },
  { id: 105, sistema: 'misiles_radar', nivel: 7, ruta: 'A', node_name: 'Tobera de empuje regulable hipersónica', effects: { velocidad_terminal_mach: 20, zona_no_escape_nez: 16, descripcion: '+20% Velocidad Terminal +16% Zona de No Escape (NEZ)' }, requirement_level: 16, cost_piezas: 2500, cost_avanzadas: 200 },
  { id: 106, sistema: 'misiles_radar', nivel: 7, ruta: 'B', node_name: 'Buscador multiespectral radar-IIR integrado', effects: { discriminacion_falsos_blancos: 22, persistencia_fijacion: 18, descripcion: '+22% Filtro Falsos Blancos +18% Persistencia Fijación' }, requirement_level: 16, cost_piezas: 2500, cost_avanzadas: 200 },
  { id: 107, sistema: 'misiles_radar', nivel: 8, ruta: 'A', node_name: 'Lanza de largo alcance orbital', effects: { alcance_maximo_letal: 28, velocidad_interceptacion_suprema: 24, descripcion: '+28% Alcance Máximo Letal +24% Vel. Interceptación' }, requirement_level: 19, cost_piezas: 3500, cost_avanzadas: 350 },
  { id: 108, sistema: 'misiles_radar', nivel: 8, ruta: 'B', node_name: 'Buscador cuántico infranqueable', effects: { inmunidad_chaff_total: 30, probabilidad_impacto_garantizada: 25, descripcion: '+30% Inmunidad Chaff +25% Certeza Impacto' }, requirement_level: 19, cost_piezas: 3500, cost_avanzadas: 350 }
];

/**
 * Genera y retorna la estructura anidada de los 108 nodos de fallback
 * @returns {Object} { sistema: { base: { nivel: {...} }, A: {...}, B: {...} } }
 */
export function getFallbackUpgradeNodes() {
  console.warn('⚠️ [UpgradeNodes] Usando nodos de fallback en memoria');
  const baseStructured = {};
  RAW_FALLBACK_NODES.forEach(node => {
    const sys = node.sistema;
    const ruta = node.ruta || 'base';
    const lvl = node.nivel;

    if (!baseStructured[sys]) {
      baseStructured[sys] = { base: {}, A: {}, B: {} };
    }
    if (!baseStructured[sys][ruta]) {
      baseStructured[sys][ruta] = {};
    }

    baseStructured[sys][ruta][lvl] = {
      id: node.id,
      avion_id: null,
      sistema_web: node.sistema,
      sistema_categoria: node.sistema,
      nivel: node.nivel,
      ruta: node.ruta,
      node_name: node.node_name,
      requirement_level: node.requirement_level,
      effects: typeof node.effects === 'string' ? JSON.parse(node.effects) : (node.effects || {}),
      stats_afectadas: typeof node.effects === 'string' ? JSON.parse(node.effects) : (node.effects || {}),
      cost_piezas: node.cost_piezas || 0,
      cost_avanzadas: node.cost_avanzadas || 0
    };
  });

  return new Proxy(baseStructured, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === 'string' && (/^\d+$/.test(prop) || prop === 'default')) {
        return target;
      }
      return target[prop];
    }
  });
}

/**
 * Consulta la tabla `upgrade_nodes_v2` desde Supabase con caché en memoria de 5 min y fallback
 * Estructura de retorno: indexada por avion_id -> categoria -> ruta (base, A, B) -> nivel (1-8)
 * @param {Object} supabase - Cliente Supabase (opcional)
 * @returns {Promise<Object>} Estructura completa de nodos por avion_id y categoria
 */
export async function getUpgradeNodes(supabase = null) {
  const now = Date.now();
  if (cachedNodes && (now - cacheTimestamp < CACHE_TTL_MS)) {
    return cachedNodes;
  }

  const client = supabase || getSupabase();
  if (!client) {
    console.warn('⚠️ [UpgradeNodes] Supabase no disponible, usando fallback en memoria');
    cachedNodes = getFallbackUpgradeNodes();
    cacheTimestamp = now;
    return cachedNodes;
  }

  try {
    // ✅ FIX: Cargar en chunks para superar el límite de 1000 filas de PostgREST
    let allData = [];
    let from = 0;
    const CHUNK_SIZE = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: chunk, error: chunkError } = await client
        .from('upgrade_nodes_v2')
        .select('*')
        .order('avion_id', { ascending: true })
        .order('sistema_categoria', { ascending: true })
        .order('nivel', { ascending: true })
        .order('ruta', { ascending: true })
        .range(from, from + CHUNK_SIZE - 1);

      if (chunkError) {
        console.error('❌ [UpgradeNodes] Error en chunk', from, ':', chunkError.message);
        break;
      }
      if (!chunk || chunk.length === 0) {
        hasMore = false;
        break;
      }
      allData = allData.concat(chunk);
      if (chunk.length < CHUNK_SIZE) {
        hasMore = false;
      } else {
        from += CHUNK_SIZE;
      }
    }

    const data = allData;
    const error = (data.length === 0) ? new Error('No se cargaron nodos') : null;

    if (error || !data || data.length === 0) {
      console.warn('⚠️ [UpgradeNodes] No se pudieron cargar nodos de upgrade_nodes_v2 en Supabase, usando fallback:', error?.message);
      cachedNodes = getFallbackUpgradeNodes();
      cacheTimestamp = now;
      return cachedNodes;
    }

    const structured = {};
    data.forEach(node => {
      const avionId = String(node.avion_id);
      const cat = node.sistema_categoria;
      const ruta = node.ruta || (node.nivel <= 4 ? 'base' : 'A');
      const lvl = node.nivel;

      if (!structured[avionId]) {
        structured[avionId] = {};
      }
      if (!structured[avionId][cat]) {
        structured[avionId][cat] = { base: {}, A: {}, B: {} };
      }
      if (!structured[avionId][cat][ruta]) {
        structured[avionId][cat][ruta] = {};
      }

      let effects = node.effects;
      if (typeof effects === 'string') {
        try { effects = JSON.parse(effects); } catch (_) { effects = {}; }
      }
      let statsAfectadas = node.stats_afectadas;
      if (typeof statsAfectadas === 'string') {
        try { statsAfectadas = JSON.parse(statsAfectadas); } catch (_) { statsAfectadas = {}; }
      }

      structured[avionId][cat][ruta][lvl] = {
        id: node.id,
        avion_id: node.avion_id,
        sistema_web: node.sistema_web,
        sistema_categoria: node.sistema_categoria,
        nivel: node.nivel,
        ruta: node.ruta,
        node_name: node.node_name,
        requirement_level: node.requirement_level,
        effects: effects || {},
        stats_afectadas: statsAfectadas || {},
        cost_piezas: node.cost_piezas || 0,
        cost_avanzadas: node.cost_avanzadas || 0
      };
    });

    cachedNodes = structured;
    cacheTimestamp = now;
    console.log(`✅ [UpgradeNodes] ${data.length} nodos cargados exitosamente desde upgrade_nodes_v2`);
    return cachedNodes;

  } catch (err) {
    console.error('❌ [UpgradeNodes] Excepción en getUpgradeNodes:', err.message);
    cachedNodes = getFallbackUpgradeNodes();
    cacheTimestamp = now;
    return cachedNodes;
  }
}

/**
 * Retorna un nodo específico (nombre + efectos + requisito)
 * @param {string} sistema - 'fuselaje', 'motor', 'avionica', etc.
 * @param {number} nivel - Nivel (1 a 8)
 * @param {string} ruta - 'base', 'A' o 'B'
 * @returns {Object|null}
 */
export function getNode(sistema, nivel, ruta = 'base') {
  const all = cachedNodes || getFallbackUpgradeNodes();
  if (!all) return null;
  const sysContainer = all[sistema] || Object.values(all).find(v => v && v[sistema])?.[sistema];
  if (!sysContainer) return null;
  const targetRuta = nivel <= 4 ? 'base' : (ruta || 'A');
  return sysContainer[targetRuta]?.[nivel] || null;
}

/**
 * Retorna todos los nodos de un sistema específico agrupados por nivel y ruta
 * @param {string} sistema - Nombre del subsistema
 * @returns {Array<Object>} Lista completa de nodos
 */
export function getNodesForSystem(sistema) {
  const all = cachedNodes || getFallbackUpgradeNodes();
  const sysData = all?.[sistema] || Object.values(all || {}).find(v => v && v[sistema])?.[sistema];
  if (!sysData) return [];

  const list = [];
  ['base', 'A', 'B'].forEach(r => {
    if (sysData[r]) {
      Object.values(sysData[r]).forEach(n => list.push(n));
    }
  });

  list.sort((a, b) => a.nivel - b.nivel || (a.ruta === 'base' ? -1 : a.ruta.localeCompare(b.ruta)));
  return list;
}

/**
 * Retorna lista plana de nodos para una categoría dada de un avión específico
 * @param {Object} planeNodes - Objeto de nodos del avión (ej: allNodes[avion_id])
 * @param {string} categoria - Categoría del sistema ('fuselaje', 'motor', etc.)
 * @returns {Array<Object>} Lista plana ordenada de nodos
 */
export function getNodesForCategory(planeNodes, categoria) {
  if (!planeNodes || !categoria || !planeNodes[categoria]) return [];
  const catData = planeNodes[categoria];
  const list = [];
  ['base', 'A', 'B'].forEach(r => {
    if (catData[r]) {
      Object.values(catData[r]).forEach(n => list.push(n));
    }
  });
  list.sort((a, b) => a.nivel - b.nivel || (a.ruta === 'base' ? -1 : a.ruta.localeCompare(b.ruta)));
  return list;
}

/**
 * Calcula los efectos acumulados normalizados para una categoría específica
 * @param {Object} planeNodes - Objeto de nodos del avión (ej: allNodes[avion_id])
 * @param {string} categoria - 'fuselaje', 'motor', 'avionica', 'canones', 'misiles_ir', 'misiles_radar', 'cohetes'
 * @param {number} nivel - Nivel alcanzado en el sistema (0-8)
 * @param {Object} rutas - Rutas elegidas por nivel: { 5: 'A'|'B', 6: 'A'|'B', 7: 'A'|'B', 8: 'A'|'B' }
 * @returns {Object} Efectos acumulados: { velocidad: 8.5, agilidad: 3.2, blindaje: 25, potencia: 45, ... }
 */
export function calculateCategoryEffects(planeNodes, categoria, nivel, rutas = {}) {
  const efectos = {};
  if (!planeNodes || !categoria || !nivel || nivel <= 0) {
    return efectos;
  }

  const catNodes = planeNodes[categoria];
  if (!catNodes) {
    return efectos;
  }

  const targetNivel = Math.min(8, Math.max(0, parseInt(nivel, 10) || 0));

  for (let n = 1; n <= targetNivel; n++) {
    let ruta = 'base';
    if (n >= 5) {
      ruta = rutas[n] || rutas[String(n)] || 'A';
    }

    const nodo = catNodes[ruta]?.[n];
    if (!nodo) continue;

    const stats = nodo.stats_afectadas || nodo.effects;
    if (stats && typeof stats === 'object') {
      Object.entries(stats).forEach(([statKey, val]) => {
        if (statKey === 'descripcion' || statKey === 'condicion' || statKey === 'pendiente') {
          return;
        }
        const numVal = Number(val);
        if (!isNaN(numVal)) {
          efectos[statKey] = (efectos[statKey] || 0) + numVal;
        }
      });
    }
  }

  return efectos;
}

/**
 * Calcula el efecto total acumulado de los nodos de un sistema
 * @deprecated Usar calculateCategoryEffects en su lugar
 * @param {Object} nodos - Objeto de nodos (de getUpgradeNodes)
 * @param {string} sistema - Sistema ('fuselaje', 'motor', 'avionica', etc.)
 * @param {number} nivel - Nivel máximo alcanzado (0-8)
 * @param {Object} rutas - Elecciones A/B por nivel: { 5: 'A', 6: 'B', ... }
 * @returns {Object} Efectos acumulados: { vida: 22.5, velocidad_total: 3.5, ... }
 */
export function calculateNodeEffects(nodos, sistema, nivel, rutas = {}) {
  const efectos = {};
  
  // Validaciones
  if (!nodos || !sistema || !nivel || nivel <= 0) {
    return efectos;
  }
  
  const sistemaNodos = nodos[sistema];
  if (!sistemaNodos) {
    console.warn(`⚠️ [UpgradeNodes] Sistema '${sistema}' no encontrado`);
    return efectos;
  }
  
  // Recorrer cada nivel desde 1 hasta el nivel máximo
  for (let n = 1; n <= nivel; n++) {
    // Determinar la ruta
    let ruta = 'base';
    if (n >= 5) {
      ruta = rutas[n] || rutas[String(n)] || 'A';
    }
    
    // Obtener el nodo
    const nodo = sistemaNodos[ruta]?.[n];
    
    if (!nodo || !nodo.effects) {
      continue;
    }
    
    // Acumular todos los efectos numéricos
    Object.entries(nodo.effects).forEach(([key, value]) => {
      // Ignorar claves no numéricas
      if (key === 'descripcion' || key === 'condicion' || key === 'pendiente') {
        return;
      }
      
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        efectos[key] = (efectos[key] || 0) + numValue;
      }
    });
  }
  
  return efectos;
}

/**
 * Invalida el caché en memoria manualmente
 */
export function invalidateUpgradeNodesCache() {
  cachedNodes = null;
  cacheTimestamp = 0;
  console.log('🔄 [UpgradeNodes] Caché de nodos invalidado');
}

console.log('✅ [UpgradeNodes] Módulo inicializado');
