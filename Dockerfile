FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine AS runner

# nginx's own entrypoint renders /etc/nginx/templates/*.template with envsubst
# into /etc/nginx/conf.d/default.conf at container start — so the API upstream can
# be changed from the environment (Railway service variable / docker-compose)
# without rebuilding the image. The default points at the deployed backend.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
ENV BACKEND_URL=https://backend-production-ea96.up.railway.app
# Bake a first render so the image is always valid on its own; the runtime
# entrypoint re-renders it from the template when BACKEND_URL is overridden.
RUN envsubst '$BACKEND_URL' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]