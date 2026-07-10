import { MongoClient, Db } from "mongodb";

const uris: Record<string, string> = {
  DB: process.env.MONGO_URI || process.env.MONGODB_URI || "",

};

const cachedClients: Record<string, MongoClient | null> = {
  DB: null,
};

const cachedDbs: Record<string, Db | null> = {
  DB: null,

};

export async function connectDB(clusterKey: keyof typeof uris, dbName: string): Promise<Db> {
  if (!uris[clusterKey]) {
    throw new Error(`Invalid cluster key: ${clusterKey}`);
  }

  if (cachedDbs[clusterKey]) {
    return cachedDbs[clusterKey] as Db;
  }

  const client = new MongoClient(uris[clusterKey]);
  // console.log('client', client);
  

  try {
    await client.connect();
    const db = client.db(dbName);
    

    cachedClients[clusterKey] = client;
    cachedDbs[clusterKey] = db;

    return db;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw new Error("Failed to connect to database");
  }
}
