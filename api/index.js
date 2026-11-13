// Point d'entrée serverless pour Vercel (Pattern A).
// On réutilise l'app Express telle quelle : une app Express est une fonction
// (req, res) valide, donc Vercel peut l'appeler directement comme handler.
// En local, on continue d'utiliser api/src/server.js (npm run dev).
import app from './src/app.js';

export default app;
