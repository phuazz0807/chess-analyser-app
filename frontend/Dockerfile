# Use Node image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy rest of the app
COPY . .

# Expose Vite port
EXPOSE 5173

# Start dev server (important: allow external access)
CMD ["npm", "run", "dev", "--", "--host"]