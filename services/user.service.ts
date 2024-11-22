import { Request, Response, NextFunction } from 'express';
import { redis } from '../utils/redis';
import userModel from '../Models/user.model';


// get user by id 

export const getUserById = async (userId: string, res: Response) => {
    const userJson = await redis.get(userId) ;
    console.log("user json",userJson)
    if(userJson){
        const user = JSON.parse(userJson);
        return res.status(200).json({
            success: true,
            user,
        });
    }
};

// get all users

export const getAllUsersService = async (res: Response) => {
    const users = await userModel.find().sort({createdAt:-1});
    if(users){
        return res.status(200).json({
            success: true,
            users,
        });
    };

};


// update user role only for admin

export const updateUserRoleService = async (res: Response,id:string,role:string) => {
    const user = await userModel.findByIdAndUpdate(id, { role }, { new: true });
    res.status(200).json({
        success: true,
        user,
    });
};