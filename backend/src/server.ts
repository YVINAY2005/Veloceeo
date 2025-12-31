// src/server.ts
import path from 'path';
import { config } from './config/index';
import { prisma } from './lib/prisma';
import app from './app'; // import the express app
import expressStatic from 'express';
const PORT = config.PORT ?? 3000;

async function startServer() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully.');

    // In production, serve built frontend (frontend/dist) from the compiled server runtime
    if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
  console.log('📦 Serving frontend from:', clientDist);

  // use express.static directly (no app.static — that doesn't exist on Express)
   // TypeScript: we still import express at top, so below we'll reuse it
  // but to avoid duplicate import issues, do this:
  const expressLib = require('express');
  app.use(expressLib.static(clientDist, { maxAge: '30d' }));

  // SPA fallback for client-side routing (but allow API calls to proceed)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT} in ${config.NODE_ENV} mode.`);
    }).on('error', (err: Error & { code?: string }) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please try a different port or kill the process using it.`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', err);
      }
    });
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }
}

startServer();
