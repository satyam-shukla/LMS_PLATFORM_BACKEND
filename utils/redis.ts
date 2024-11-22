import Redis from "ioredis";
require("dotenv").config();

const redisClient = () => {
    if (process.env.REDIS_URL) {
        console.log("Attempting to connect to Redis...");
        
        const client = new Redis(process.env.REDIS_URL, {
            tls: process.env.REDIS_TLS === "true" ? {} : undefined,
        });

        // Log on successful connection
        client.on("ready", () => {
            console.log("Redis connected successfully!");
        });

        // Log any connection errors
        client.on("error", (err) => {
            console.error("Redis connection error:", err);
        });

        return client;
    }

    throw new Error("Redis connection failed: REDIS_URL is not defined");
};

export const redis = redisClient();
