import request from 'supertest';
import app from '../app';
import mongoose from 'mongoose';
import User from '../models/User';

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/velosync-test');
});

afterAll(async () => {
  await User.deleteMany({});
  await mongoose.connection.close();
});

describe('Auth Routes', () => {
  describe('POST /auth/signup', () => {
    it('should create a new user and return token', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'password123',
          fullName: 'Test User'
        });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('access');
      expect(res.body.user).toHaveProperty('email', 'test@example.com');
      expect(res.body.user).toHaveProperty('role', 'admin');
    });

    it('should reject duplicate email', async () => {
      await request(app)
        .post('/auth/signup')
        .send({
          email: 'duplicate@example.com',
          password: 'password123'
        });

      const res = await request(app)
        .post('/auth/signup')
        .send({
          email: 'duplicate@example.com',
          password: 'password123'
        });
      
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/auth/signup')
        .send({
          email: 'login@example.com',
          password: 'password123'
        });
    });

    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123'
        });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('access');
    });

    it('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword'
        });
      
      expect(res.status).toBe(401);
    });
  });
});
