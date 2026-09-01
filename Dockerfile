# Utilizar imagen oficial ligera de Node.js 20 basada en Alpine Linux
FROM node:20-alpine

# Establecer directorio de trabajo en el contenedor
WORKDIR /app

# Copiar manifiestos de dependencias
COPY package*.json ./

# Instalar dependencias con flag de compatibilidad legacy
RUN npm install --legacy-peer-deps --omit=dev

# Copiar todo el código fuente del proyecto
COPY . .

# Configurar variables de entorno por defecto en producción
ENV NODE_ENV=production
ENV PORT=3000

# Exponer el puerto 3000
EXPOSE 3000

# Comando de inicio del servidor militar
CMD ["node", "server.js"]
