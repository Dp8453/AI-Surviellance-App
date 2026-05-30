import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';

// Load environmental variables
dotenv.config();

import { connectDB } from './config/db';
import apiRouter from './routes';

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow serving images/videos statically to client
}));

// CORS Configuration
app.use(cors({
  origin: '*', // Allow all client development origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiter to guard API endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP. Please try again later.' },
});
app.use('/api/', limiter);

// Serve uploads folder statically to allow download of videos & frames by client
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Connect to MongoDB Database
connectDB();

// API Endpoints
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'nominal', timestamp: new Date() });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ 
    message: err.message || 'An unhandled server execution failure occurred.' 
  });
});

// Listen
app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`AI Surviellance server listening on port: ${PORT}`);
  console.log(`Mode: MERN Production Ready`);
  console.log(`================================================================`);
});

export default app;
