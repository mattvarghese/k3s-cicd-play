import { buildApp } from './app.js';

const start = async () => {
    const app = await buildApp();
    try {
        // 0.0.0.0 is the "Internal Bridge" for Docker/k3s
        await app.listen({ port: 3000, host: '0.0.0.0' });
        console.log('✅ Backend Container is LIVE on port 3000');
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
