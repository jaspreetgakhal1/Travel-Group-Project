import dotenv from 'dotenv';

dotenv.config();

const requiredVariables = ['MONGO_URI', 'JWT_SECRET'];
const missingVariables = requiredVariables.filter((variableName) => !process.env[variableName]);

if (missingVariables.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVariables.join(', ')}`);
}

const getAllowedOrigins = () => {
  const rawValue = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
  return rawValue
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

export const env = {
  port: Number(process.env.PORT ?? 5000),
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  allowedOrigins: getAllowedOrigins(),
};
