# 🇵🇾 PARAGUAY-FFAA | METALSTORM

> **Sistema Táctico de Control Operacional y Gestión de Rendimiento del Escuadrón PARAGUAY FFAA `[PRY]` en MetalStorm.**

---

## 📋 Descripción General

**PARAGUAY-FFAA | METALSTORM** es una plataforma web táctica de alto rendimiento diseñada para la administración, registro y supervisión del escuadrón militar paraguayo en el simulador de combate aéreo *MetalStorm*.

La plataforma proporciona un ecosistema completo para pilotos, oficiales y mando superior:
- **Cuadro de Mando Operacional:** Métricas en tiempo real, seguimiento del objetivo semanal del escuadrón, gráficos de tendencia y clasificación Top 5 de pilotos.
- **Registro Táctico de Tokens:** Carga individual y masiva con validación estricta de límites (200 tokens estándar, 250 en eventos *Black Market*).
- **Hangar de Aeronaves:** Catálogo completo de cazas (F-14, F-16, Su-27, Gripen, MiG-29, etc.), niveles, habilidades especiales y módulos pasivos.
- **Centro de Control del Escuadrón (Admin & Owner):** Gestión de pilotos, promociones de rango militar, control de ausencias y convocatorias de combate.
- **Exportación Segura de Datos:** Descarga de reportes en formato CSV con sanitización contra inyecciones de fórmulas.
- **PWA Instalable (Offline First):** Capacidad de instalación nativa en dispositivos Android, iOS y Desktop.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
|---|---|
| **Frontend** | HTML5 Semántico, CSS3 Vanilla (Custom Properties / Design Tokens), JavaScript ES6+ Modular |
| **Diseño / Tipografía** | Rajdhani (Visual Táctico), Inter (Interfaz Base), JetBrains Mono (Métricas y Códigos) |
| **Backend** | Node.js, Express.js (Arquitectura RESTful Modular) |
| **Persistencia** | Supabase (PostgreSQL Cloud) + In-Memory Fallback State Engine |
| **Seguridad** | JWT con firma y expiración, Bcrypt (salt rounds 10), Helmet, CORS Whitelist, Zod Validation, Rate Limiting |
| **PWA** | Service Worker v3.2, Cache-First para estáticos, Network-First para APIs |

---

## 🚀 Inicio Rápido

### Requisitos Previos
- Node.js 18.x o superior
- npm o bun

### Instalación y Ejecución

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-organizacion/paraguay-ffaa-metalstorm.git
cd paraguay-ffaa-metalstorm

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env

# 4. Iniciar servidor de desarrollo
npm run dev

# 5. Iniciar servidor en producción
npm start
```

El servidor estará accesible en `http://localhost:3000`.

---

## 🛡️ Niveles de Estado Operacional

| Estado | Rango de Tokens / Condición | Significado Operacional |
|---|---|---|
| 🟢 **VERDE** | $\ge 175$ tokens | Cumplimiento militar óptimo con la meta del escuadrón |
| 🟡 **NARANJA** | $130 - 174$ tokens | Advertencia táctica / Por debajo de la cuota mínima |
| 🔴 **ROJO** | $100 - 129$ tokens | Estado crítico / Riesgo inminente de baja |
| ⚫ **NEGRO** | $< 100$ tokens o 0 días | Inactivo / Falta grave a las operaciones de vuelo |

---

## 👥 Estructura de Rangos y Permisos (RBAC)

1. **👑 OWNER (Comandante en Jefe):**
   - Control total del escuadrón, reasignación de líderes, purga de datos históricos y asignación de rangos `ADMIN`.
2. **⭐ ADMIN (Oficial de Operaciones):**
   - Carga masiva de tokens, altas y bajas de pilotos, publicación de normativas y apertura de eventos.
3. **🎖️ VETERANO (Piloto Experimentado):**
   - Vuelo en escuadrilla, acceso al hangar avanzado y consulta de estadísticas globales.
4. **✈️ MIEMBRO (Piloto Regular):**
   - Registro de rendimiento semanal, gestión de hangar propio y visualización de normativas.

---

## 📚 Documentación Adicional

- [Arquitectura del Sistema](./ARCHITECTURE.md)
- [Guía de Despliegue en Producción](./DEPLOYMENT_GUIDE.md)
- [Manual de Usuario y Piloto](./USER_MANUAL.md)
- [Referencia de la API RESTful](./API_REFERENCE.md)
- [Configuración PWA y Offline](./PWA_SETUP.md)

---

## 📜 Licencia y Derechos

© 2026 Escuadrón PARAGUAY FFAA `[PRY]` en MetalStorm. Todos los derechos reservados.
