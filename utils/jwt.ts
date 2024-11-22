require('dotenv').config()
import express, { NextFunction, Request, Response } from "express";
import { IUser } from "../Models/user.model";
import { redis } from "./redis";


interface ITokenOptions {
    expires: Date; // Expires date for the token
    maxAge: number;  // Max age for the token in milliseconds
    httpOnly: boolean; // Prevents JavaScript from accessing the cookie via document.cookie
    sameSite?: "lax" | "strict" | "none" | undefined; // Controls whether the cookie is sent with cross-site requests
    secure?: boolean; // Ensures that the cookie is only sent over HTTPS
}

// parse environment variables to integrate with fallback values
export const accessTokenExpires = parseInt(process.env.ACCESS_TOKEN_EXPIRE || "300", 10);
export const refreshTokenExpires = parseInt(process.env.REFRESH_TOKEN_EXPIRE || "1200", 10);

//  options for cookies
export const accessTokenOptions: ITokenOptions = {
    expires: new Date(Date.now() + accessTokenExpires * 60 * 60 * 1000),
    maxAge: accessTokenExpires * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
};

export const refreshTokenOptions: ITokenOptions = {
    expires: new Date(Date.now() + refreshTokenExpires * 24 * 60 * 60 * 1000),
    maxAge: refreshTokenExpires * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
};

export const sendToken = (user: IUser, statusCode: number, res: Response) => {
    const accessToken = user.SingAccessToken();
    const refreshToken = user.SingRefreshToken();
    // upload session data in redis

    redis.set(user.id, JSON.stringify(user) as any); // Store user data in Redis with an expiration time of 24 hours



    // Only set secure cookies in production
    if (process.env.NODE_ENV === "production") {
        refreshTokenOptions.secure = true;
    };

    res.cookie("accessToken", accessToken, accessTokenOptions);
    res.cookie("refreshToken", refreshToken, refreshTokenOptions);

    res.status(statusCode).json({
        success: true,
        user,
        accessToken,
    })

}