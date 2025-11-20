FROM node:18-alpine

WORKDIR /usr/src/app

# 1. Install all dependencies (including devDependencies)
COPY package*.json ./
RUN npm ci

# 2. Copy source
COPY . .

# 3. Build TypeScript
RUN npm run build

# 4. Optionally remove devDependencies to shrink image
RUN npm prune --production

# 5. Make sure your upload directories exist
RUN mkdir -p /usr/src/app/uploads/receipts /usr/src/app/uploads/bills /usr/src/app/uploads/invoices

CMD ["npm", "start"]