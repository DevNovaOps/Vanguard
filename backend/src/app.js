import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import nodeRoutes from './routes/nodeRoutes.js';
import connectionRoutes from './routes/connectionRoutes.js';
import topologyRoutes from './routes/topologyRoutes.js';
import complianceRoutes from './routes/complianceRoutes.js';
<<<<<<< HEAD
import incidentRoutes from './routes/incidentRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import simulationRoutes from './routes/simulationRoutes.js';
=======
import riskRoutes from './routes/riskRoutes.js';
<<<<<<< HEAD
import aiAgentRoutes from './routes/aiAgentRoutes.js';
=======
>>>>>>> dfa4e20a1cd9f5b8556979c77109897349e97a81
>>>>>>> 168437ca7514200b7e0b6c836faa005c17b892a0

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Morgan request logging in development mode
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// API Routes Mounting
app.use('/api/auth', authRoutes);
app.use('/api/nodes', nodeRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/network', topologyRoutes);
app.use('/api/compliance', complianceRoutes);
<<<<<<< HEAD
app.use('/api/incidents', incidentRoutes);
app.use('/api/mitigations', mitigationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/incidents/dashboard', dashboardRoutes);
app.use('/api/simulation', simulationRoutes);

=======
app.use('/api/risk', riskRoutes);
<<<<<<< HEAD
app.use('/api/agent', aiAgentRoutes);
=======
>>>>>>> dfa4e20a1cd9f5b8556979c77109897349e97a81
>>>>>>> 168437ca7514200b7e0b6c836faa005c17b892a0

// Health Check Route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Project Vanguard API is operational',
    timestamp: new Date()
  });
});

// Catch-All 404 Route
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

// Centralized Error-Handling Middleware
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

export default app;
