# 1. Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the app explicitly passing the API URL if needed via build args
# However, React apps run in the browser, so they call the API from the client's perspective.
RUN npm run build

# 2. Production stage using Nginx
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# We'll use a custom nginx config to allow react-router to work properly
# and optionally proxy /api requests to the backend container
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
