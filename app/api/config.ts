import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { MongoClient } from 'mongodb';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not defined in the environment variables.`);
  }
  return value;
}

let pineconeClient: Pinecone | null = null;
export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: requireEnv('PINECONE_API_KEY'),
    });
  }
  return pineconeClient;
}

let openaiClient: OpenAI | null = null;
export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: requireEnv('OPENAI_API_KEY'),
    });
  }
  return openaiClient;
}

let mongoClient: MongoClient | null = null;
function getMongoClient(): MongoClient {
  if (!mongoClient) {
    mongoClient = new MongoClient(requireEnv('MONGO_DB_URI'));
  }
  return mongoClient;
}

export async function connectToDatabase() {
  try {
    const client = getMongoClient();
    await client.connect();
    console.log('Connected to MongoDB successfully.');
    return client.db(); // Return the database instance
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}
