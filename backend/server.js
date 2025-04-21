const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cluster = require('cluster');
const os = require('os');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);

  // Fork workers for each CPU core
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died with code ${code}, signal ${signal}`);
    cluster.fork(); // Restart a worker if it dies
  });
} else {
  const app = express();
  const PORT = process.env.PORT || 5001;

  if (!process.env.MONGO_URI) {
    console.error(`Worker ${process.pid}: Error: MONGO_URI is not defined in .env file`);
    process.exit(1);
  }

  // Middleware
  app.use(express.json({ limit: '10mb' })); // Memory management: limit payload size
  app.use(cors({ origin: 'http://127.0.0.1:8080' })); // Explicitly allow frontend origin
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, // 100 requests per window
  }));

  // Routes
  const postRoutes = require('./routes/posts');
  app.use('/api/posts', postRoutes);

  app.get('/', (req, res) => {
    res.send('Welcome to the Blog API');
  });

  // MongoDB Connection (start server only after connection)
  mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 10, // Memory management: limit connection pool
    serverSelectionTimeoutMS: 5000, // Timeout after 5s
  })
    .then(() => {
      console.log(`Worker ${process.pid}: MongoDB Connected`);
      // Start server only after MongoDB is ready
      app.listen(PORT, () => {
        console.log(`Worker ${process.pid} running on port http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error(`Worker ${process.pid}: MongoDB connection error:`, err);
      process.exit(1);
    });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error(`Worker ${process.pid}: Error:`, err.stack);
    res.status(500).json({ message: 'Something went wrong on the server' });
  });

  // Cleanup on process exit
  process.on('SIGTERM', () => {
    mongoose.connection.close(() => {
      console.log(`Worker ${process.pid}: MongoDB connection closed`);
      process.exit(0);
    });
  });
}
