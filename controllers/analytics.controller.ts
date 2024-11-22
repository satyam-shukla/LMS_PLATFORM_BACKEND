import { Request,Response,NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../MiddleWare/catchAsyncError";
import { generateLast12MonthData } from "../utils/analytics.generator";
import userModel from "../Models/user.model";
import courseModel from "../Models/course.model";
import OrderModel from "../Models/order.model";

// get user analytics this is only for admin 

export const getUserAnalytics = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        
        const users = await generateLast12MonthData(userModel);
        return res.status(200).json({
            success: true,
            users
        });

    } catch (error:any) {
        return next(new ErrorHandler(error.message, 500));
    }
});


// get courses analytics this is only for admin 

export const getCoursesAnalytics = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        
        const courses = await generateLast12MonthData(courseModel);
        return res.status(200).json({
            success: true,
            courses
        });

    } catch (error:any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// get orders analytics this is only for admin 

export const getOrderAnalytics = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        
        const orders = await generateLast12MonthData(OrderModel);
        return res.status(200).json({
            success: true,
            orders
        });

    } catch (error:any) {
        return next(new ErrorHandler(error.message, 500));
    }
});