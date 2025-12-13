---
description: Repository Information Overview
alwaysApply: true
---

# Kong Microservices with JWT - Repository Information

## Repository Summary

This is a microservices architecture seminar project demonstrating JWT-based authentication and API Gateway patterns. It consists of two Node.js Express microservices (Auth and Product services) fronted by Kong API Gateway, with JWT validation enforcing access control on protected endpoints.

## Repository Structure

- **auth-service/**: JWT token issuing service using Express and SQLite
- **product-service/**: Product management service with public/private endpoints using Express and SQLite
- **kong.yml**: Kong declarative configuration defining routes, services, and JWT authentication policies
- **docker-compose.yml**: Container orchestration for the entire system

### Main Repository Components
- **Auth Service**: Issues JWT tokens, manages user authentication via SQLite
- **Product Service**: Provides public product listings and private order management endpoints
- **Kong API Gateway**: Routes requests with JWT verification on protected endpoints

## Projects

### Auth Service

**Configuration File**: `auth-service/package.json`

#### Language & Runtime
**Language**: JavaScript (Node.js)  
**Runtime**: Node.js 22 (Alpine)  
**Package Manager**: npm (pnpm in Docker)  
**Build System**: Docker

#### Dependencies
**Main Dependencies**:
- `express` ^4.17.1 - Web framework
- `jsonwebtoken` ^8.5.1 - JWT token generation
- `sqlite3` ^5.0.2 - SQLite database

#### Build & Installation

```bash
npm install
# or
pnpm install
```

#### Docker

**Dockerfile**: `auth-service/Dockerfile`  
**Base Image**: `node:22-alpine`  
**Build Steps**:
- Install pnpm globally
- Install build tools (build-base, python3) for sqlite3 compilation
- Install dependencies with `pnpm install --frozen-lockfile`
- Copy application source code

**Container Configuration**:
- Port: 3000 (mapped to 3001 on host)
- Database: SQLite (`users.db`)
- Default user: testuser/123456
- Restart: on-failure

#### Main Entry Point
**File**: `auth-service/index.js`  
**Port**: 3001  
**Endpoints**:
- `POST /auth/login` - Issue JWT token (audience: testuser)
- `GET /users/:id` - Retrieve user information by ID

#### Application Logic
- Creates SQLite `users` table on startup
- Seeds default test user (testuser)
- JWT_SECRET: `YOUR_GLOBAL_JWT_SECRET` (must match Kong configuration)
- Token expiration: 1 hour

---

### Product Service

**Configuration File**: `product-service/package.json`

#### Language & Runtime
**Language**: JavaScript (Node.js)  
**Runtime**: Node.js 22 (Alpine)  
**Package Manager**: npm (pnpm in Docker)  
**Build System**: Docker

#### Dependencies
**Main Dependencies**:
- `express` ^4.17.1 - Web framework
- `sqlite3` ^5.0.2 - SQLite database

#### Build & Installation

```bash
npm install
# or
pnpm install
```

#### Docker

**Dockerfile**: `product-service/Dockerfile`  
**Base Image**: `node:22-alpine`  
**Build Steps**: Identical to auth-service (pnpm, build tools, frozen lockfile)

**Container Configuration**:
- Port: 3000 (mapped to 3002 on host)
- Database: SQLite (`products.db`)
- Sample products: Laptop, Mouse
- Restart: on-failure

#### Main Entry Point
**File**: `product-service/index.js`  
**Port**: 3002  
**Endpoints**:
- `GET /products` - Public endpoint listing all products
- `POST /orders` - Private endpoint (JWT protected by Kong) for creating orders

#### Application Logic
- Creates SQLite `products` table with sample data on startup
- Public products endpoint accessible without authentication
- Private orders endpoint requires valid JWT token passed through Kong
- Receives Kong headers (`x-consumer-id`, `x-consumer-custom-id`) after JWT validation

---

### Kong API Gateway

**Configuration File**: `kong.yml`

#### Version & Runtime
**Kong Version**: 2.8.1-alpine  
**Mode**: DB-less (declarative configuration)

#### Configuration Structure

**Services**:
- **auth-service**: Routes auth requests to `http://auth-service:3001`
  - `/api/auth/login` - Login endpoint
  - `/api/users` - User info endpoint

- **product-service**: Routes to `http://product-service:3002`
  - `/api/products` - Public products (no JWT required)
  - `/api/orders` - Private orders (JWT required via jwt plugin)

**Authentication**:
- JWT plugin applied to `/api/orders` route
- Consumer: `app-client-api` (custom_id: testuser)
- JWT Secret: `YOUR_GLOBAL_JWT_SECRET`
- Algorithm: HS256

#### Container Configuration
- Ports: 8008 (proxy), 8001 (admin)
- Restart: always
- Network: kong-net (bridge)
- Config mount: `kong.yml:/opt/kong/kong.yml`

---

## Orchestration

### Docker Compose

**File**: `docker-compose.yml`

**Network**: kong-net (bridge)

**Services**:
1. **auth-service** - Port 3001, mounts source code for development
2. **product-service** - Port 3002, mounts source code for development
3. **kong** - Ports 8008 (proxy), 8001 (admin), depends on both services

**Volume Mounts**:
- Both services mount source code at `/usr/src/app` for live development
- node_modules protected with anonymous volume to prevent host override

**Startup Command**:

```bash
docker-compose up --build
```

---

## Usage & Operations

### Start the System

```bash
docker-compose up --build
```

### Access Endpoints

1. **Get JWT Token**:
```bash
curl -X POST http://localhost:8008/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser"}'
```

2. **Access Public API** (no auth):
```bash
curl http://localhost:8008/api/products
```

3. **Access Private API** (requires JWT):
```bash
curl -X POST http://localhost:8008/api/orders \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"product_id": 1, "quantity": 2}'
```

### Development

Services support hot-reload via mounted volumes. Modify code in `auth-service/` or `product-service/` directories and changes reflect in running containers.

