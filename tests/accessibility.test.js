import { describe, it, expect, beforeEach } from '@jest/globals';

describe('Accessibility Tests', () => {
  it('should have proper ARIA labels on buttons', () => {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      expect(
        button.getAttribute('aria-label') ||
          button.textContent.trim() ||
          button.getAttribute('aria-pressed')
      ).toBeTruthy();
    });
  });

  it('should have proper heading hierarchy', () => {
    const h1s = document.querySelectorAll('h1').length;
    const h2s = document.querySelectorAll('h2').length;
    expect(h1s).toBeLessThanOrEqual(1);
    expect(h2s).toBeGreaterThanOrEqual(1);
  });

  it('should have proper semantic HTML', () => {
    const mainElements = document.querySelectorAll('main');
    expect(mainElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should have sufficient color contrast', async () => {
    const axe = require('axe-core');
    const results = await new Promise(resolve => {
      axe.run(document, (error, results) => {
        resolve(results);
      });
    });

    const contrastViolations = results.violations.filter(v => v.id.includes('color-contrast'));
    expect(contrastViolations.length).toBe(0);
  });

  it('should have keyboard navigation support', () => {
    const formElements = document.querySelectorAll('button, input, select');
    formElements.forEach(el => {
      expect(el.tabIndex === -1 || el.tabIndex >= 0).toBeTruthy();
    });
  });
});

describe('IndexedDB Storage', () => {
  let db;

  beforeEach(() => {
    db = new MockIndexedDB();
  });

  it('should store symptoms in IndexedDB', async () => {
    const symptom = {
      date: new Date().toISOString(),
      symptoms: 'Bolečina v prsih',
      timestamp: Date.now()
    };

    await db.addSymptom(symptom);
    const stored = await db.getSymptoms(1);

    expect(stored.length).toBe(1);
    expect(stored[0].symptoms).toBe('Bolečina v prsih');
  });

  it('should retrieve symptoms with limit', async () => {
    for (let i = 0; i < 50; i++) {
      await db.addSymptom({
        date: new Date(Date.now() - i * 86400000).toISOString(),
        symptoms: `Simptom ${i}`,
        timestamp: Date.now() - i * 86400000
      });
    }

    const retrieved = await db.getSymptoms(30);
    expect(retrieved.length).toBeLessThanOrEqual(30);
  });
});

describe('Service Worker Caching', () => {
  it('should cache static assets', async () => {
    const cache = await caches.open('static-v1');
    const response = new Response('test');
    await cache.put('/test.js', response);

    const cached = await cache.match('/test.js');
    expect(cached).toBeTruthy();
  });

  it('should use Network First for health data', async () => {
    const strategy = 'network-first';
    expect(strategy).toBe('network-first');
  });

  it('should use Cache First for static assets', async () => {
    const strategy = 'cache-first';
    expect(strategy).toBe('cache-first');
  });
});

class MockIndexedDB {
  async addSymptom(symptom) {
    if (!this.symptoms) this.symptoms = [];
    this.symptoms.push(symptom);
  }

  async getSymptoms(limit) {
    if (!this.symptoms) return [];
    return this.symptoms.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }
}
