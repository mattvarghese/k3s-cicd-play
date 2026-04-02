import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { buildApp } from './app.js'; // We haven't made this yet!

describe('Shopping List API', () => {
  let app: any;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  it('GET /api/items should return a 200 status', async () => {
    const response = await supertest(app.server).get('/api/items');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('POST /api/items should create a new item', async () => {
    const newItem = {
      username: 'matt',
      item_name: 'Sourdough Bread',
      quantity: 2
    };

    const response = await supertest(app.server)
      .post('/api/items')
      .send(newItem);

    expect(response.status).toBe(201); // 201 = Created
    expect(response.body.item_name).toBe('Sourdough Bread');
    expect(response.body).toHaveProperty('id');
  });
});
