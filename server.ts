import { app } from "./app"
import { v2 as cloudinary } from "cloudinary"
import connectDB from "./utils/db";
require('dotenv').config();

// create server 

// cloudinary config

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_SECRET_KEY,
});

app.listen(process.env.PORT, () => {
    console.log(`server is running on port ${process.env.PORT}`)
    connectDB();
})
