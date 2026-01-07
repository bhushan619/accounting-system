# Accounting System

A full-stack accountancy management system with a Node.js/Express backend and React/Vite frontend.

## Quick Start

### Development
```bash
# Backend
cd backend && npm ci && npm run dev

# Frontend (from root)
npm ci && npm run dev
```

### Docker
```bash
docker-compose up --build
```

## Project Structure

```
/
├── src/                  # Frontend source code
│   ├── components/       # React components
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom hooks
│   └── pages/            # Page components
├── backend/              # Backend source code
│   ├── src/
│   │   ├── models/       # MongoDB models
│   │   ├── routes/       # API routes
│   │   └── middleware/   # Express middleware
│   └── uploads/          # File uploads
├── index.html            # Entry HTML
├── vite.config.ts        # Vite configuration
└── docker-compose.yml    # Docker orchestration
```

## API Documentation

Swagger docs available at: http://localhost:4000/docs
