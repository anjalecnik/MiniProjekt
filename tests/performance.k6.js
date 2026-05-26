import http from 'k6/http';
import { check, group, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(99)<1500', 'p(95)<1000'],
    http_req_failed: ['rate<0.1']
  }
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export default function () {
  group('Symptoms', () => {
    const symptomPayload = {
      symptoms: 'Bolečina v glavi in vročina',
      date: new Date().toISOString()
    };

    const postResponse = http.post(`${BASE_URL}/vnos`, JSON.stringify(symptomPayload), {
      headers: { 'Content-Type': 'application/json' }
    });

    check(postResponse, {
      'POST symptom status 201': r => r.status === 201,
      'POST symptom response time < 200ms': r => r.timings.duration < 200
    });

    sleep(1);

    const getResponse = http.get(`${BASE_URL}/vnosi`);
    check(getResponse, {
      'GET symptoms status 200': r => r.status === 200,
      'GET symptoms response time < 300ms': r => r.timings.duration < 300,
      'GET symptoms returns array': r => Array.isArray(JSON.parse(r.body))
    });

    sleep(1);
  });

  group('Medications', () => {
    const medPayload = {
      name: 'Aspirin',
      dosage: '500mg',
      frequency: 'daily',
      start_date: new Date().toISOString().split('T')[0]
    };

    const postResponse = http.post(`${BASE_URL}/zdravila`, JSON.stringify(medPayload), {
      headers: { 'Content-Type': 'application/json' }
    });

    check(postResponse, {
      'POST medication status 201': r => r.status === 201,
      'POST medication response time < 200ms': r => r.timings.duration < 200
    });

    sleep(1);

    const getResponse = http.get(`${BASE_URL}/zdravila`);
    check(getResponse, {
      'GET medications status 200': r => r.status === 200,
      'GET medications response time < 300ms': r => r.timings.duration < 300
    });

    sleep(1);
  });

  group('Health Check', () => {
    const response = http.get(`${BASE_URL}/health`);
    check(response, {
      'Health check status 200': r => r.status === 200,
      'Health check response time < 100ms': r => r.timings.duration < 100
    });
  });
}
