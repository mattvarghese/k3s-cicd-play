import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyPostgres from '@fastify/postgres';

export async function buildApp() {
  const app = Fastify({
    logger: true     // Change to false if you don't want diagnostics
  });

  // 1. Regular CORS registration
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) {
        cb(null, true); // Allow non-browser requests (like curl or postman)
        return;
      }

      try {
        const { hostname } = new URL(origin);
        if (hostname === "localhost" || hostname === "127.0.0.1") {
          cb(null, true);
        } else {
          cb(new Error("CORS: Origin not allowed"), false);
        }
      } catch {
        cb(new Error("CORS: Invalid Origin"), false);
      }
    },
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  // 2. Register the Postgres Plugin
  // In TDD, DATABASE_URL comes from your .env (local) or GitHub Actions (CI)
  await app.register(fastifyPostgres, {
    connectionString: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/shopping_db'
  });

  // 3. The GET Route: Fetch all items
  app.get('/api/items', async (request, reply) => {
    try {
      const { rows } = await app.pg.query('SELECT * FROM shopping_items');
      return rows;
    } catch (err) {
      reply.code(500).send({ error: 'Database connection failed' });
    }
  });

  // 4. The POST Route: Create a new item
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

  // 5. The DELETE Route: Remove an item by ID
  app.delete('/api/items/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const query = 'DELETE FROM shopping_items WHERE id = $1 RETURNING id';

    try {
      const { rows } = await app.pg.query(query, [id]);

      if (rows.length === 0) {
        return reply.code(404).send({ error: 'Item not found' });
      }

      return { message: 'Item deleted successfully', id: rows[0].id };
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ error: 'Failed to delete item' });
    }
  });

  return app;
}