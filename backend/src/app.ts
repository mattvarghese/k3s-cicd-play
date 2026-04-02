import Fastify from 'fastify';
import fastifyPostgres from '@fastify/postgres';

export async function buildApp() {
  const app = Fastify({
    logger: false // keeps test output clean
  });

  // 1. Register the Postgres Plugin
  // In TDD, DATABASE_URL comes from your .env (local) or GitHub Actions (CI)
  await app.register(fastifyPostgres, {
    connectionString: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/shopping_db'
  });

  // 2. The GET Route: Fetch all items
  app.get('/api/items', async (request, reply) => {
    try {
      const { rows } = await app.pg.query('SELECT * FROM shopping_items');
      return rows;
    } catch (err) {
      reply.code(500).send({ error: 'Database connection failed' });
    }
  });

  // 3. The POST Route: Create a new item
  app.post('/api/items', async (request, reply) => {
    const { username, item_name, quantity } = request.body as any;

    const query = `
      INSERT INTO shopping_items (username, item_name, quantity) 
      VALUES ($1, $2, $3) 
      RETURNING id, username, item_name, quantity, created_at
    `;

    try {
      const { rows } = await app.pg.query(query, [username, item_name, quantity]);
      reply.code(201); // 201 = Created
      return rows[0];
    } catch (err) {
      reply.code(500).send({ error: 'Failed to create item' });
    }
  });

  return app;
}