import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyPostgres from '@fastify/postgres';
import fastifyJwt, { FastifyJWTOptions } from '@fastify/jwt';
import jwksClient from 'jwks-rsa';

// This is required so the { preHandler: [app.authenticate] } 
// doesn't get a complaint that authenticate doesn't exist on app
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
  }
}

export async function buildApp() {
  const app = Fastify({
    logger: true     // Change to false if you don't want diagnostics
  });

  // A. JWT Configuration
  // Define the variable at the top of buildApp
  const issuerUrl = process.env.KEYCLOAK_ISSUER_URL || 'http://localhost:8080/realms/shopping-realm';

  // Define the JWKS provider
  const jwksProvider = jwksClient.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    // This is the magic line that handles all 3 modes:
    jwksUri: process.env.KEYCLOAK_JWKS_URL || `${issuerUrl}/protocol/openid-connect/certs`
  });

  // 1. JWT Configuration
  // We cast the options to FastifyJWTOptions to force TS to recognize the fields
  // 1.1. Define the JWKS Client
  const client = jwksClient({
    jwksUri: process.env.KEYCLOAK_JWKS_URL || `${issuerUrl}/protocol/openid-connect/certs`,
    cache: true,
    rateLimit: true
  });

  // 1.2. Create a helper to fetch the key manually
  const getKey = async (header: any) => {
    const key = await client.getSigningKey(header.kid);
    return key.getPublicKey();
  };

  // 1.3. Register the plugin with the manual getter
  const jwtOptions: any = {
    secret: process.env.NODE_ENV === 'test'
      ? (process.env.JWT_SECRET || 'test-secret')
      : getKey, // Pass the function directly
    verify: {
      issuer: issuerUrl,
      algorithms: ['RS256']
    }
  };

  await app.register(fastifyJwt, jwtOptions);

  // 2. The Auth Guard (Decorator)
  app.decorate("authenticate", async (request: any, reply: any) => {
    try {
      // If we are in test mode and a special header is present, skip real JWT check
      // This is the "Software Artist" secret door for TDD
      if (process.env.NODE_ENV === 'test' && request.headers['x-test-auth'] === 'true') {
        request.user = { sub: 'test-user-id', preferred_username: 'matt' };
        return;
      }

      await request.jwtVerify();
    } catch (err) {// Log the full error internally for your diagnostics
      app.log.error(err);

      // Send a clean, structured message to the frontend
      reply.code(401).send({
        error: 'Unauthorized',
        message: err // Usually safe enough, e.g., "Authorization token expired"
      });
    }
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

  // B. Protected Routes
  // Notice the 'preHandler' - this is the "bouncer" at the door

  // 3. The GET Route: Fetch all items
  app.get('/api/items', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const username = (request.user as any).preferred_username;
      const { rows } = await app.pg.query(
        'SELECT * FROM shopping_items WHERE username = $1',
        [username]
      );
      return rows;
    } catch (err) {
      reply.code(500).send({ error: 'Database connection failed' });
    }
  });

  // 4. The POST Route: Create a new item
  app.post('/api/items', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { item_name, quantity } = request.body as any;

    const username = (request.user as any).preferred_username;

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
  app.delete('/api/items/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    // Extract identity from the bouncer, not the user input
    const username = (request.user as any).preferred_username;

    // SCOPED QUERY: Only delete if BOTH the ID and the Username match
    const query = 'DELETE FROM shopping_items WHERE id = $1 AND username = $2 RETURNING id';

    try {
      const { rows } = await app.pg.query(query, [id, username]);

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