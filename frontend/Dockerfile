# Build stage
FROM node:24-alpine AS build
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY . .

# Accept build arguments for environment variables
ARG VITE_API_URL=http://your-server-ip:5001


# Set environment variables for Vite build
ENV VITE_API_URL=$VITE_API_URL


# Build the app
RUN pnpm build

# Production stage
FROM nginx:alpine AS final
WORKDIR /usr/share/nginx/html

# Create non-root user
RUN addgroup -S appuser && adduser -S appuser -G appuser

# Remove default nginx static assets
RUN rm -rf ./*

# Copy built assets from build stage
COPY --from=build /app/dist .

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create necessary directories and set permissions
RUN mkdir -p /var/cache/nginx /var/run /var/log/nginx && \
    chown -R appuser:appuser /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html && \
    chmod -R 755 /var/cache/nginx /var/run /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown appuser:appuser /var/run/nginx.pid

# Update nginx.conf to run as non-root
RUN sed -i 's/listen 80;/listen 8080;/' /etc/nginx/conf.d/default.conf

EXPOSE 8080 8443

# Switch to non-root user
USER appuser

CMD ["nginx", "-g", "daemon off;"]
