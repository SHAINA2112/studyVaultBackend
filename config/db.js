import mongoose from 'mongoose'

let isConnecting = null

export default async function connectDB() {
  mongoose.set('strictQuery', true)

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  if (isConnecting) {
    await isConnecting
    return mongoose.connection
  }

  isConnecting = mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  })

  try {
    const conn = await isConnecting

    console.log(`[db] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`)

    return conn
  } catch (err) {
    console.error('[db] Failed to connect to MongoDB:', err.message)
    throw err
  } finally {
    isConnecting = null
  }
}