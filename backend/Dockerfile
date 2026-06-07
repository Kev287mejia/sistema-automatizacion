# Multi-stage build para optimizar tamaño y seguridad en Producción

# 1. Builder Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar configuración de paquetes
COPY package*.json ./
COPY tsconfig.json ./

# Instalar TODAS las dependencias (incluyendo devDependencies para compilar)
RUN npm ci

# Copiar el código fuente
COPY src ./src

# Compilar TypeScript a JavaScript
RUN npm run build

# 2. Production Stage
FROM node:20-alpine AS production

WORKDIR /app

# Instalar solo dependencias de producción
COPY package*.json ./
RUN npm ci --only=production

# Copiar el build desde la fase anterior
COPY --from=builder /app/dist ./dist

# Crear directorio de logs
RUN mkdir -p logs && chown node:node logs

# Configurar entorno
ENV NODE_ENV=production
ENV PORT=3000

# Exponer el puerto
EXPOSE 3000

# Correr la aplicación como usuario no privilegiado por seguridad
USER node

# Comando de inicio
CMD ["node", "dist/index.js"]
