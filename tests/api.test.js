import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const API_URL = 'http://localhost:3000';

describe('API Endpoints', () => {
  describe('POST /vnos - Symptom Entry', () => {
    it('should create a new symptom entry', async () => {
      const response = await request(API_URL).post('/vnos').send({
        symptoms: 'Bolečina v prsih, slabost',
        date: new Date().toISOString()
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.symptoms).toBe('Bolečina v prsih, slabost');
    });

    it('should reject missing fields', async () => {
      const response = await request(API_URL).post('/vnos').send({ symptoms: 'Test' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });
  });

  describe('GET /vnosi - Retrieve Symptoms', () => {
    it('should retrieve symptoms', async () => {
      const response = await request(API_URL).get('/vnosi');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should limit results to 30', async () => {
      const response = await request(API_URL).get('/vnosi');

      expect(response.body.length).toBeLessThanOrEqual(30);
    });
  });

  describe('POST /zdravila - Add Medication', () => {
    it('should add a medication', async () => {
      const response = await request(API_URL)
        .post('/zdravila')
        .send({
          name: 'Aspirin',
          dosage: '500mg',
          frequency: 'daily',
          start_date: new Date().toISOString().split('T')[0]
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.name).toBe('Aspirin');
    });
  });

  describe('GET /zdravila - Get Medications', () => {
    it('should retrieve active medications', async () => {
      const response = await request(API_URL).get('/zdravila');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /obiski - Add Health Visit', () => {
    it('should add a health visit', async () => {
      const response = await request(API_URL)
        .post('/obiski')
        .send({
          doctor_name: 'Dr. Novak',
          visit_date: new Date().toISOString().split('T')[0],
          diagnosis: 'Prehladna',
          notes: 'Predhodno bolne grlo'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /obiski - Get Visits', () => {
    it('should retrieve health visits', async () => {
      const response = await request(API_URL).get('/obiski');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /push/subscribe - Subscribe to Push', () => {
    it('should subscribe to push notifications', async () => {
      const response = await request(API_URL)
        .post('/push/subscribe')
        .send({
          subscription: {
            endpoint: 'https://example.com/push',
            keys: {
              p256dh: 'test-key',
              auth: 'test-auth'
            }
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /izvoz-pdf - Export Summary', () => {
    it('should export health summary', async () => {
      const response = await request(API_URL).get('/izvoz-pdf');

      expect(response.status).toBe(200);
      expect(response.text).toContain('POVZETEK ZDRAVSTVENEGA DNEVNIKA');
    });
  });

  describe('GET /health - Health Check', () => {
    it('should return health status', async () => {
      const response = await request(API_URL).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });
});
