import mongoose from 'mongoose';

/**
 * Connects to MongoDB using Mongoose.
 * Exits the process on failure so process managers (pm2, Docker, etc.)
 * can restart cleanly rather than running with a dead DB connection.
 */
export default async function connectDB() {
  try {
    mongoose.set('strictQuery', true);

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Modern mongoose (8.x) no longer needs useNewUrlParser/useUnifiedTopology,
      // they're defaults, but serverSelectionTimeoutMS is worth setting explicitly.
      serverSelectionTimeoutMS: 10000,
    });

    console.log(`[db] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error('[db] MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[db] MongoDB disconnected');
    });
  } catch (err) {
    console.error('[db] Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }
}
