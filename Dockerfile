# Utilizar imagen oficial ligera de Node.js 22 basada en Alpine Linux (con soporte nativo WebSocket)
FROM node:22-alpine

# Establecer directorio de trabajo en el contenedor
WORKDIR /app

# Copiar manifiestos de dependencias
COPY package*.json ./

# Instalar dependencias con flag de compatibilidad legacy
RUN npm install --legacy-peer-deps --omit=dev

# Copiar todo el código fuente del proyecto
COPY . .

# FIX-703: Cambiar ownership de /app al usuario `node` (ya existe en la imagen)
RUN chown -R node:node /app

# FIX-703: Ejecutar como usuario no-root (seguridad)
USER node

# FIX-703: Cambiar ownership de /app al usuario `node` (ya existe en la imagen)
RUN chown -R node:node /app

# FIX-703: Ejecutar como usuario no-root (seguridad)
USER node

# Configurar variables de entorno por defecto en producción
ENV NODE_ENV=production
ENV PORT=3000

# Exponer el puerto 3000
EXPOSE 3000

# Comando de inicio del servidor militar
CMD ["node", "server.js"]