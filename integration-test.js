const axios = require('axios');
const { expect } = require('chai');

const KONG_URL = 'http://localhost:8008';

let authToken = null;

describe('Kong Microservices JWT Integration Tests', function() {
  
  describe('1. Authentication Flow', function() {
    
    it('should login and receive JWT token', async function() {
      try {
        const response = await axios.post(`${KONG_URL}/api/auth/login`, {
          username: 'testuser'
        });
        
        expect(response.status).to.equal(200);
        expect(response.data).to.have.property('token');
        expect(response.data).to.have.property('expiresIn');
        expect(response.data.expiresIn).to.equal('1h');
        
        authToken = response.data.token;
        console.log('✓ JWT Token received:', authToken.substring(0, 20) + '...');
      } catch (error) {
        throw new Error(`Login failed: ${error.message}`);
      }
    });

    it('should reject login with invalid username', async function() {
      try {
        await axios.post(`${KONG_URL}/api/auth/login`, {
          username: ''
        });
        throw new Error('Should have rejected empty username');
      } catch (error) {
        expect(error.response.status).to.equal(400);
        expect(error.response.data).to.have.property('message');
      }
    });
  });

  describe('2. Public Product Access (No Auth Required)', function() {
    
    it('should access public products endpoint without authentication', async function() {
      try {
        const response = await axios.get(`${KONG_URL}/api/products`);
        
        expect(response.status).to.equal(200);
        expect(response.data).to.have.property('products');
        expect(response.data).to.have.property('access');
        expect(response.data.access).to.equal('PUBLIC');
        expect(response.data.products).to.be.an('array');
        expect(response.data.products.length).to.be.greaterThan(0);
        
        console.log('✓ Products retrieved:', response.data.products.map(p => p.name).join(', '));
      } catch (error) {
        throw new Error(`Failed to get products: ${error.message}`);
      }
    });

    it('should contain expected products (Laptop and Mouse)', async function() {
      try {
        const response = await axios.get(`${KONG_URL}/api/products`);
        const productNames = response.data.products.map(p => p.name);
        
        expect(productNames).to.include('Laptop');
        expect(productNames).to.include('Mouse');
        
        const laptop = response.data.products.find(p => p.name === 'Laptop');
        expect(laptop.price).to.equal(1200);
      } catch (error) {
        throw new Error(`Product validation failed: ${error.message}`);
      }
    });
  });

  describe('3. Protected Order Creation (Auth Required)', function() {
    
    it('should reject order creation without authentication token', async function() {
      try {
        await axios.post(`${KONG_URL}/api/orders`, {
          product_id: 1,
          quantity: 2
        });
        throw new Error('Should have rejected request without token');
      } catch (error) {
        expect([401, 403]).to.include(error.response.status);
      }
    });

    it('should create order with valid JWT token', async function() {
      if (!authToken) {
        throw new Error('Auth token not available. Authentication test may have failed.');
      }

      try {
        const response = await axios.post(`${KONG_URL}/api/orders`, 
          {
            product_id: 1,
            quantity: 2
          },
          {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        expect(response.status).to.equal(201);
        expect(response.data).to.have.property('message');
        expect(response.data.message).to.equal('Order created successfully');
        expect(response.data).to.have.property('order');
        expect(response.data.order.product_id).to.equal(1);
        expect(response.data.order.quantity).to.equal(2);
        expect(response.data.order.unit_price).to.equal(1200);
        expect(response.data.order.total_price).to.equal(2400);
        
        console.log('✓ Order created:', {
          product: response.data.order.product_name,
          quantity: response.data.order.quantity,
          totalPrice: response.data.order.total_price
        });
      } catch (error) {
        throw new Error(`Order creation failed: ${error.message}`);
      }
    });

    it('should include consumer info in order response', async function() {
      if (!authToken) {
        throw new Error('Auth token not available.');
      }

      try {
        const response = await axios.post(`${KONG_URL}/api/orders`, 
          {
            product_id: 2,
            quantity: 5
          },
          {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        expect(response.data).to.have.property('user_info');
        expect(response.data.user_info).to.have.property('username');
        expect(response.data.user_info.username).to.equal('testuser');
        
        console.log('✓ User info in order:', response.data.user_info);
      } catch (error) {
        throw new Error(`User info validation failed: ${error.message}`);
      }
    });

    it('should reject order with invalid product ID', async function() {
      if (!authToken) {
        throw new Error('Auth token not available.');
      }

      try {
        await axios.post(`${KONG_URL}/api/orders`, 
          {
            product_id: 999,
            quantity: 1
          },
          {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        throw new Error('Should have rejected invalid product ID');
      } catch (error) {
        expect(error.response.status).to.equal(404);
        expect(error.response.data.message).to.equal('Product not found');
      }
    });

    it('should reject order with invalid data', async function() {
      if (!authToken) {
        throw new Error('Auth token not available.');
      }

      try {
        await axios.post(`${KONG_URL}/api/orders`, 
          {
            product_id: 1
          },
          {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        throw new Error('Should have rejected invalid order data');
      } catch (error) {
        expect(error.response.status).to.equal(400);
      }
    });
  });

  describe('4. Full Flow Integration Test (A-Z)', function() {
    
    it('should complete full flow: Login → Get Products → Create Order', async function() {
      try {
        console.log('\n--- Full Flow Test ---');
        
        console.log('Step 1: Login to get JWT token');
        const loginResponse = await axios.post(`${KONG_URL}/api/auth/login`, {
          username: 'testuser'
        });
        expect(loginResponse.status).to.equal(200);
        const token = loginResponse.data.token;
        console.log('✓ Logged in successfully, token received');

        console.log('Step 2: Retrieve public products (no auth required)');
        const productsResponse = await axios.get(`${KONG_URL}/api/products`);
        expect(productsResponse.status).to.equal(200);
        expect(productsResponse.data.products.length).to.be.greaterThan(0);
        const productId = productsResponse.data.products[0].id;
        console.log('✓ Retrieved products:', productsResponse.data.products.map(p => p.name).join(', '));

        console.log('Step 3: Create order with JWT token (protected endpoint)');
        const orderResponse = await axios.post(`${KONG_URL}/api/orders`, 
          {
            product_id: productId,
            quantity: 1
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        expect(orderResponse.status).to.equal(201);
        expect(orderResponse.data.order.product_id).to.equal(productId);
        console.log('✓ Order created for:', orderResponse.data.order.product_name);

        console.log('Step 4: Verify authentication was enforced by Kong');
        expect(orderResponse.data.user_info.username).to.equal('testuser');
        console.log('✓ Kong verified JWT and passed consumer info');

        console.log('\n✓✓✓ Full flow completed successfully! ✓✓✓\n');
      } catch (error) {
        throw new Error(`Full flow test failed: ${error.message}`);
      }
    });
  });
});
