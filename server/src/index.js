import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import authRoutes from './routes/authRoutes.js';

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (env.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '6mb' }));

app.get('/api/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);

app.use((error, _request, response, _next) => {
  if (error.message === 'Origin not allowed by CORS') {
    return response.status(403).json({ message: error.message });
  }

  console.error('Unhandled server error', error);
  return response.status(500).json({ message: 'Internal server error.' });
});

const startServer = async () => {
  await connectDatabase();
  app.listen(env.port, () => {
    console.log(`Auth API running on http://localhost:${env.port}`);
  });
};

startServer();
