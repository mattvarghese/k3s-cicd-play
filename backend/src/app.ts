import Fastify from 'fastify';

export async function buildApp() {
  const app = Fastify();

  // We define the route, but we don't connect to DB 
  // and we return an empty object instead of an array.
  app.get('/api/items', async (request, reply) => {
    return { message: "Not implemented yet" }; 
  });

  return app;
}