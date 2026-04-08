import cors from 'cors';
import express from 'express';
import adminRoutes from './routes/adminRoutes.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import joinRequestRoutes from './routes/joinRequestRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import postRoutes from './routes/postRoutes.js';
import tripRoutes from './routes/tripRoutes.js';
import userRoutes from './routes/userRoutes.js';
import walletRoutes from './routes/walletRoutes.js';

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
app.use('/api/admin', adminRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/join-requests', joinRequestRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wallet', walletRoutes);

app.use((error: Error, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const parseError = error as Error & { type?: string };

  if (error.message === 'Origin not allowed by CORS') {
    return response.status(403).json({ message: error.message });
  }

  if (parseError.type === 'entity.parse.failed') {
    return response.status(400).json({ message: 'Invalid JSON payload.' });
  }

  if (parseError.type === 'entity.too.large') {
    return response.status(413).json({ message: 'Poster images are too large. Please upload smaller images.' });
  }

  console.error('Unhandled server error', error);
  return response.status(500).json({ message: 'Internal server error.' });
});

const startServer = async (): Promise<void> => {
  await connectDatabase();
  const server = app.listen(env.port, () => {
    console.log(`Auth API running on http://localhost:${env.port}`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.log(`Port ${env.port} is busy. Attempting to kill the existing process or try another port.`);
    } else {
      console.error('Server error:', error);
    }
  });

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  });

  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  });
};

void startServer();
