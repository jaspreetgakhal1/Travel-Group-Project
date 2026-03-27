// Added by Codex: project documentation comment for server\src\config\env.js
import dotenv from 'dotenv';

// Load environment variables from .env into process.env.
dotenv.config();

// Variables the app requires at startup.
const requiredVariables = ['MONGO_URI', 'JWT_SECRET'];
// Find required variables that are missing.
const missingVariables = requiredVariables.filter((variableName) => !process.env[variableName]);

// Stop startup early if required configuration is missing.
if (missingVariables.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVariables.join(', ')}`);
}

const getAllowedOrigins = () => {
  // Support both common Vite dev ports when no explicit allowlist is provided.
  const rawValue = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173,http://localhost:5174';
  // Support comma-separated origins and remove empty values.
  return rawValue
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

// Export normalized runtime configuration.
export const env = {
  // Port is read from env and converted to a number.
  port: Number(process.env.PORT ?? 5000),
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  // JWT expiration fallback if not set in env.
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  // CORS allowlist derived from CLIENT_ORIGIN.
  allowedOrigins: getAllowedOrigins(),
};

