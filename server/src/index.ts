import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
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
const port = Number(process.env.PORT || 5000);
const clientDistPath = path.resolve(process.cwd(), 'dist');
const clientIndexPath = path.join(clientDistPath, 'index.html');
const hasBuiltClient = existsSync(clientIndexPath);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      // When the built frontend is served by this Express server in production,
      // browser API calls come from the deployed app origin instead of the Vite
      // dev origin. Allow that origin so single-port AWS deployments keep working.
      if (hasBuiltClient) {
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

app.get('/api/health', (_request: Request, response: Response) => {
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

if (hasBuiltClient) {
  // Production-only frontend hosting for AWS EC2: serve the built Vite app from Express
  // so the browser UI and API can share the same public port without changing dev setup.
  app.use(express.static(clientDistPath));

  // Return the built SPA entry for any non-API route so client-side routing works after
  // direct refreshes or deep links in a single-server deployment on AWS.
  app.get(/^(?!\/api(?:\/|$)).*/, (_request: Request, response: Response) => {
    response.sendFile(clientIndexPath);
  });
}

app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
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
  const server = app.listen(port, '0.0.0.0', () => {
    if (!hasBuiltClient) {
      console.warn(`Production frontend build not found at ${clientIndexPath}. Run "npm run build" before opening the app in a browser.`);
    }

    if (hasBuiltClient) {
      console.log(`SplitNGo production server running on http://localhost:${port}`);
      return;
    }

    console.log(`Auth API running on http://localhost:${port}`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.log(`Port ${port} is busy. Attempting to kill the existing process or try another port.`);
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
