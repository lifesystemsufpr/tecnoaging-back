# Production Deployment Guide

This guide explains how to deploy the TecnoAging NestJS application to production using Docker.

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- PostgreSQL database (can be provided via docker-compose)
- Environment variables configured

### 1. Environment Setup

Copy the example environment file and configure it for production:

```bash
cp .env.example .env
```

Edit `.env` with your values:

- `DATABASE_URL`: Your PostgreSQL connection string
- `JWT_SECRET`: A secure random string for JWT signing
- `CORS_ORIGIN`: Your frontend domain
- Other configuration as needed

### 2. Build and Deploy

#### Option A: Using Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f api

# Stop services
docker-compose -f docker-compose.prod.yml down
```

#### Option B: Using Docker directly

```bash
# Build the image
docker build -t tecnoaging-api .

# Run with environment file
docker run -d \
  --name tecnoaging-api \
  --env-file .env \
  -p 3000:3000 \
  tecnoaging-api
```

### 3. Database Migrations

Migrations are automatically run during container startup. The startup script handles:

- Waiting for database availability
- Running pending migrations with `prisma migrate deploy`
- Ensuring Prisma client is generated

### 4. Health Checks

The application includes built-in health checks:

- **Endpoint**: `GET /status`
- **Docker health check**: Automatically configured
- **Monitoring**: Memory usage (heap and RSS)

## 🔒 Security Best Practices

The Dockerfile implements several security best practices:

### ✅ What's Implemented

1. **Non-root user**: Application runs as `nestjs` user (UID 1001)
2. **Multi-stage build**: Separates build and runtime environments
3. **Minimal base image**: Uses Alpine Linux for smaller attack surface
4. **Dependency optimization**: Removes dev dependencies in production
5. **Health checks**: Built-in application health monitoring
6. **Resource limits**: Configurable memory and CPU limits
7. **Proper file permissions**: Files owned by non-root user

### Rolling Updates

```bash
# Update with zero downtime
docker-compose -f docker-compose.prod.yml up -d --no-deps api
```

### Common Commands

```bash
# View container logs
docker-compose -f docker-compose.prod.yml logs -f api

# Execute commands in running container
docker-compose -f docker-compose.prod.yml exec api sh

# Restart services
docker-compose -f docker-compose.prod.yml restart api

# View container stats
docker stats

# Check health status
curl http://localhost:3000/status
```

### Load Balancing

Consider adding a load balancer (nginx, HAProxy) in front of multiple API instances.
