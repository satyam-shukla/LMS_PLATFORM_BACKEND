import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../MiddleWare/catchAsyncError";
import ErrorHandler from "../utils/ErrorHandler";
import OrderModel, { IOrder } from "../Models/order.model";
import userModel from "../Models/user.model";
import courseModel from "../Models/course.model";
import path from "path";
import ejs from "ejs";
import sendEmail from "../utils/sendmail";
import NotificationModel from "../Models/notification.model";
import { getAllOrdersService, newOrder } from "../services/order.service";


//  create a new order 

export const createOrder = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { courseId, payment_info } = req.body as IOrder;
        const user = await userModel.findById(req.user?._id);
        if (!user) {
            return next(new ErrorHandler("User not found", 404));
        };

        const courseExistsInUser = user.courses.some((course: any) => {
            return course._id.toString() === courseId; // Compare course IDs properly
        });
        if (courseExistsInUser) {
            return next(new ErrorHandler("You are not eligible for this course you already purchase this ", 404));
        };

        const course = await courseModel.findById(courseId);
        if (!course) {
            return next(new ErrorHandler("Invalid courseId", 404));
        };

        const data: any = {
            courseId: course._id,
            userId: user?._id,
            payment_info,
        };

        // Prepare email data (optional)
        const mailData = {
            order: {
                _id: (course._id as string).toString().slice(0, 6),
                name: course.name,
                price: course.price,
                date: new Date().toLocaleDateString('en-US', { year: "numeric", month: "long", day: "numeric" }),
            }
        };

        // Prepare HTML content for email (optional)
        const htmlContent = await ejs.renderFile(path.join(__dirname, "../mails/order-confirmation.ejs"), { order: mailData });

        try {
            if (user) {
                await sendEmail({
                    email: user.email,
                    subject: "Order Confirmation",
                    template: "order-confirmation.ejs",
                    data: mailData
                });
            }
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        };

        // Update the user's courses (optional)
        user?.courses.push(course._id as any);
        await user?.save();

        // Create a new notification for the user (optional)
        await NotificationModel.create({
            user: user?._id,
            title: "New Order",
            message: `You have a new order from ${course?.name}`
        });

        course.purchased = course.purchased ? course.purchased + 1 : 1;
        await course.save();

        // Call function to process the order 
        newOrder(data, res, next);

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// get all orders only for admin 

export const getAllOrders = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        getAllOrdersService(res);
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});