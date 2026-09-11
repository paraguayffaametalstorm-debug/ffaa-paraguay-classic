/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM - TRAITS HELPER
 * Gestión de rasgos únicos de aeronaves
 * ============================================================================
 */

/**
 * Diccionario de traits con descripciones y efectos
 */
export const TRAITS_CATALOG = {
  'Armor Plating': {
    icon: '🛡️',
    description: 'Reduce el daño de cañones en un 55-64%',
    effect: 'damage_reduction_cannons',
    value: 55
  },
  'Cool Engines': {
    icon: '❄️',
    description: 'Reduce el rango de bloqueo de misiles IR al 50%',
    effect: 'ir_lock_range_reduction',
    value: 50
  },
  'Cruising Altitude': {
    icon: '☁️',
    description: 'Aumenta la velocidad a cierta altitud',
    effect: 'speed_at_altitude',
    value: 15
  },
  'Delta Wing': {
    icon: '🔺',
    description: 'Aumenta la tasa de giro al frenar en +20°/s',
    effect: 'turn_rate_while_braking',
    value: 20
  },
  'Stealth': {
    icon: '👻',
    description: 'Reduce el rango de bloqueo de misiles a 25-33%',
    effect: 'missile_lock_range_reduction',
    value: 33
  },
  'Swing Wing': {
    icon: '🦅',
    description: 'Permite cambiar la geometría del ala (velocidad vs giro)',
    effect: 'variable_wing_geometry',
    value: 0
  },
  'Unstable Cannons': {
    icon: '💥',
    description: 'Cañones poderosos pero causan daño al sobrecalentarse',
    effect: 'unstable_cannons',
    value: 0
  },
  'Unstable Engines': {
    icon: '🔥',
    description: 'Postcombustión funciona a 0 combustible pero daña el motor',
    effect: 'unstable_engines',
    value: 0
  },
  'Look And Shoot': {
    icon: '🎯',
    description: 'Apunta a enemigos centrando la cámara en ellos',
    effect: 'look_and_shoot',
    value: 0
  },
  'Full Authority': {
    icon: '⚡',
    description: '+10% tasa de giro pero acumula Tunnel Vision',
    effect: 'full_authority',
    value: 10
  },
  'Loyal Wingman': {
    icon: '🤖',
    description: 'Drone aliado que vuela contigo',
    effect: 'loyal_wingman',
    value: 0
  },
  'Thrust Reverser': {
    icon: '🔄',
    description: 'Frena rápidamente y reduce bloqueo IR',
    effect: 'thrust_reverser',
    value: 0
  }
};

/**
 * Obtener los traits de un avión
 * @param {Object} plane - Objeto del avión
 * @returns {Array} Lista de traits
 */
export function getPlaneTraits(plane) {
  if (!plane || !plane.traits) return [];
  if (Array.isArray(plane.traits)) return plane.traits;
  if (typeof plane.traits === 'string') {
    try {
      return JSON.parse(plane.traits);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Obtener la información completa de un trait
 * @param {string} traitName - Nombre del trait
 * @returns {Object|null} Información del trait
 */
export function getTraitInfo(traitName) {
  return TRAITS_CATALOG[traitName] || null;
}

/**
 * Obtener la lista de traits con información completa
 * @param {Object} plane - Objeto del avión
 * @returns {Array} Lista de traits con información
 */
export function getPlaneTraitsWithInfo(plane) {
  const traits = getPlaneTraits(plane);
  return traits.map(traitName => ({
    name: traitName,
    ...getTraitInfo(traitName)
  }));
}

console.log('✅ [Traits] Módulo inicializado');
