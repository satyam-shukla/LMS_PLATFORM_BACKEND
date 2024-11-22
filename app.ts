require("dotenv").config();
import express, { NextFunction, Request, Response } from "express";
export const app = express();
import cors from "cors";
import cookieParser from "cookie-parser";
import { ErrorMiddleware } from "./MiddleWare/error";
import userRouter from "./routes/user.routes";
import courseRouter from "./routes/course.routes";
import orderRouter from "./routes/order.routes";
import notificationRouter from "./routes/notification.routes";
import analyticsRouter from "./routes/analytics.routes";
import LayoutRouter from "./routes/layout.routes";
// body parser
app.use(express.json({ limit: "50mb" }));

// cookie parser
app.use(cookieParser());

// cors

app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  })
);


app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

app.use("/api/v1", userRouter,courseRouter,orderRouter,notificationRouter,analyticsRouter,LayoutRouter);

app.get("/test", (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({
    success: true,
    message: "Api is working",
  });
});

// unknow  route
app.use("*", (req: Request, res: Response, next: NextFunction) => {
  const err = new Error(`Route${req.originalUrl} not found`) as any;
  err.statusCode = 404
  next(err)
});

app.use(ErrorMiddleware)