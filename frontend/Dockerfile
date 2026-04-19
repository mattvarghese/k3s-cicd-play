# Stage 1: Build
FROM node:24-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production (Serving with Nginx)
FROM nginx:alpine
# Copy the built static files from Vite's default output directory
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy a custom nginx config if you need client-side routing (optional but recommended)
# COPY nginx.conf /etc/nginx/conf.d/default.conf
# This is necessary so when frontend calls its own port with /api/items, we forward to backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
