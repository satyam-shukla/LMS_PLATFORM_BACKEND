import { NextFunction, Response } from "express";
import { CatchAsyncError } from "../MiddleWare/catchAsyncError";
import OrderModel from "../Models/order.model";

// create a new order

export const newOrder = CatchAsyncError(async(data:any,res:Response)=>{
    const order =  await OrderModel.create(data);
    res.status(200).send({
        success: true,
        order
    })
});

// get all orders

export const getAllOrdersService = async (res: Response) => {
    const orders = await OrderModel.find().sort({createdAt:-1});
    if(orders){
        return res.status(200).json({
            success: true,
            orders,
        });
    };

};