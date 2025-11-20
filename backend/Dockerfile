FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

RUN mkdir -p /usr/src/app/uploads/receipts /usr/src/app/uploads/bills /usr/src/app/uploads/invoices

EXPOSE 4000

CMD ["npm", "start"]
