import express, { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "./catchAsyncError";
import ErrorHandler from "../utils/ErrorHandler";
import { JwtPayload, verify } from "jsonwebtoken";
import { redis } from "../utils/redis";


// authenticated user

export const isAuthenticateUser = CatchAsyncError(async(req: Request, res: Response, next: NextFunction) => {
    const access_token = req.cookies.accessToken;
    if (!access_token) {
        return next(new ErrorHandler("Login first to access this resource", 400));
    };

    const decoded = verify(access_token, process.env.ACCESS_TOKEN as string) as JwtPayload;
    if(!decoded) {
        return next(new ErrorHandler("access token is  not  valid", 400));

    };

    const user = await redis.get(decoded.id);

    if (!user) {
        return next(new ErrorHandler("Please login to access this resource", 400));
    }

    req.user = JSON.parse(user);
    next();

})