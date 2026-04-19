import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { buildApp } from './app.js';

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

  it('DELETE /api/items/:id should remove an item and return 200', async () => {
    // 1. Create an item first so we have a valid ID to delete
    const tempItem = {
      username: 'testuser',
      item_name: 'Delete Me',
      quantity: 1
    };
    const postResponse = await supertest(app.server)
      .post('/api/items')
      .send(tempItem);

    const targetId = postResponse.body.id;

    // 2. Delete the item
    const deleteResponse = await supertest(app.server)
      .delete(`/api/items/${targetId}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).toHaveProperty('message', 'Item deleted successfully');
    expect(deleteResponse.body.id).toBe(targetId);
  });

  it('DELETE /api/items/:id should return 404 if item does not exist', async () => {
    // Using a very large ID or a random UUID depending on your DB schema
    const nonExistentId = 999999;

    const response = await supertest(app.server)
      .delete(`/api/items/${nonExistentId}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Item not found');
  });

});
