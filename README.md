# Kong Microservices with JWT Authentication

A complete microservices architecture demonstration featuring JWT-based authentication, API Gateway routing, and protected endpoints using Kong API Gateway.

## Overview

This project showcases a practical implementation of microservices architecture with the following components:

- **Auth Service**: Issues JWT tokens for authenticated users
- **Product Service**: Manages product listings (public) and order creation (protected)
- **Kong API Gateway**: Routes requests, enforces JWT authentication on protected endpoints
- **SQLite Databases**: Persistent storage for users and products

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Applications                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                ┌──────────▼──────────┐
                │   Kong API Gateway  │
                │  (Port 8008 Proxy)  │
                └──┬────────────────┬─┘
       ┌───────────┘                └──────────────┐
       │                                           │
   ┌───▼──────┐                          ┌─────────▼──┐
   │ Auth Svc │                          │ Product Svc│
   │(Port 3001)                          │ (Port 3002)│
   │          │                          │            │
   │ ┌──────┐ │                          │ ┌─────────┐│
   │ │users │ │                          │ │products ││
   │ │  .db │ │                          │ │  .db    ││
   │ └──────┘ │                          │ └─────────┘│
   └──────────┘                          └────────────┘
```

## Key Features

- **JWT Token Generation**: Auth service issues HS256 signed tokens
- **Protected Endpoints**: Kong validates JWT on `/api/orders` route
- **Public Access**: `/api/products` accessible without authentication
- **Microservices Pattern**: Independent services with dedicated databases
- **API Gateway Pattern**: Single entry point for all client requests
- **Integration Tests**: Comprehensive test suite covering full authentication flow

## Prerequisites

- **Docker & Docker Compose**: For containerized deployment
- **Node.js 22+**: For running services locally (optional)
- **npm or pnpm**: Package manager

### Optional: For Local Testing Without Docker

- Node.js 22 with npm
- SQLite3 development libraries

## Quick Start

### 1. Start the System

```bash
docker-compose up --build
```

This command:

- Builds both microservices
- Starts Kong API Gateway
- Initializes SQLite databases with sample data
- All services are ready after 5-10 seconds

### 2. Wait for Startup

Kong may take a few seconds to load the configuration. Check Kong is ready:

```bash
curl http://localhost:8008/api/products
```

When successful, you'll see a JSON response with the product list.

## API Endpoints

### Authentication Service (via Kong)

**Login Endpoint**

```bash
curl -X POST http://localhost:8008/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser"}'
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "1h"
}
```

### Product Service (via Kong)

**Get All Products** (Public - No Auth Required)

```bash
curl http://localhost:8008/api/products
```

**Response:**

```json
{
  "products": [
    { "id": 1, "name": "Laptop", "price": 1200.0 },
    { "id": 2, "name": "Mouse", "price": 25.0 }
  ],
  "access": "PUBLIC"
}
```

**Create Order** (Protected - JWT Required)

```bash
curl -X POST http://localhost:8008/api/orders \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"product_id": 1, "quantity": 2}'
```

**Response:**

```json
{
  "message": "Order created successfully",
  "order": {
    "product_id": 1,
    "product_name": "Laptop",
    "quantity": 2,
    "unit_price": 1200.0,
    "total_price": 2400.0
  },
  "user_info": {
    "id": "some-id",
    "username": "testuser"
  }
}
```

## Integration Tests

Comprehensive test suite covering the complete authentication and order flow using Mocha.

### Installation

```bash
npm install
```

### Running Tests

```bash
npm test
```

### Test Coverage

The integration tests validate:

1. **Authentication Flow**

   - Login and token generation
   - Invalid username handling

2. **Public Access**

   - Products endpoint accessible without auth
   - Correct product data returned

3. **Protected Endpoints**

   - Orders endpoint rejects unauthenticated requests
   - Valid JWT token grants access
   - Consumer info passed by Kong
   - Invalid product ID handling
   - Invalid order data validation

4. **Full Flow (A-Z)**
   - Complete end-to-end flow from login through order creation
   - Verification of Kong's authentication enforcement

### Test Output Example

```
Kong Microservices JWT Integration Tests
  1. Authentication Flow
    ✓ should login and receive JWT token (234ms)
    ✓ should reject login with invalid username (145ms)
  2. Public Product Access (No Auth Required)
    ✓ should access public products endpoint without authentication (156ms)
    ✓ should contain expected products (Laptop and Mouse) (138ms)
  3. Protected Order Creation (Auth Required)
    ✓ should reject order creation without authentication token (156ms)
    ✓ should create order with valid JWT token (178ms)
    ✓ should include consumer info in order response (167ms)
    ✓ should reject order with invalid product ID (145ms)
    ✓ should reject order with invalid data (152ms)
  4. Full Flow Integration Test (A-Z)
    ✓ should complete full flow: Login → Get Products → Create Order (467ms)

  10 passing
```

## Local Development (Without Docker)

### Auth Service Setup

```bash
cd auth-service
npm install
npm start
```

Runs on: `http://localhost:3001`

### Product Service Setup

```bash
cd product-service
npm install
npm start
```

Runs on: `http://localhost:3002`

### Kong Configuration

If running Kong separately:

1. Install Kong 2.8.1
2. Configure with `kong.yml` in DB-less mode
3. Set environment variables:
   ```bash
   export KONG_DATABASE=off
   export KONG_DECLARATIVE_CONFIG=$(pwd)/kong.yml
   export KONG_PROXY_LISTEN=0.0.0.0:8000
   export KONG_ADMIN_LISTEN=0.0.0.0:8001
   ```

## Configuration

### JWT Secret

Default JWT secret: `YOUR_GLOBAL_JWT_SECRET`

To change, update the environment variable in:

- `auth-service/index.js` (JWT_SECRET)
- `kong.yml` (jwt plugin configuration)

**Important**: Keep the secret consistent across services.

### Default Credentials

- **Username**: `testuser`
- **Password**: `123456`
- **Token Expiry**: 1 hour

## Project Structure

```
├── README.md                  # This file
├── package.json               # Root package with test dependencies
├── integration-test.js        # Mocha integration tests
├── docker-compose.yml         # Container orchestration
├── kong.yml                   # Kong API Gateway configuration
├── auth-service/              # Authentication microservice
│   ├── index.js              # Express app & JWT generation
│   ├── package.json          # Auth service dependencies
│   ├── Dockerfile            # Container definition
│   └── users.db              # SQLite (auto-created)
└── product-service/           # Product management microservice
    ├── index.js              # Express app & order handling
    ├── package.json          # Product service dependencies
    ├── Dockerfile            # Container definition
    └── products.db           # SQLite (auto-created)
```

## Troubleshooting

### Kong Not Accepting Requests

**Symptom**: `Connection refused` or `Cannot POST /api/auth/login`

**Solution**: Wait for Kong startup (check logs):

```bash
docker-compose logs kong
```

### Invalid Token Error

**Symptom**: 401 Unauthorized on `/api/orders`

**Solution**:

1. Ensure JWT_SECRET matches in auth service and kong.yml
2. Verify token hasn't expired (1 hour expiry)
3. Include `Authorization: Bearer <token>` header

### Services Not Communicating

**Symptom**: Connection errors between Kong and microservices

**Solution**:

1. Check all containers are running: `docker-compose ps`
2. Verify network: `docker network ls | grep kong-net`
3. Restart services: `docker-compose down && docker-compose up --build`

## Performance Notes

- Auth service: ~50-100ms per login
- Product service: ~30-50ms per request
- Kong routing overhead: ~20-30ms per request
- Total end-to-end latency: ~100-200ms

## Security Considerations

- JWT tokens expire in 1 hour
- HS256 algorithm used (symmetric)
- Tokens validated by Kong before reaching product service
- Default credentials should be changed in production
- Use HTTPS in production environments
- Secrets should be managed via environment variables

## Contributing

This is a seminar project for educational purposes.

## License

ISC
