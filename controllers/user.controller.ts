import express, { Request, Response, NextFunction } from "express";
import userModel, { IUser } from "../Models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../MiddleWare/catchAsyncError";
import { JwtPayload, Secret, sign, verify } from "jsonwebtoken";
import sendEmail from "../utils/sendmail";
import { accessTokenOptions, refreshTokenOptions, sendToken } from "../utils/jwt";
import { redis } from "../utils/redis";
import { getAllUsersService, getUserById, updateUserRoleService } from "../services/user.service";
import cloudinary from "cloudinary"


// Register user
interface IRegistrationBody {
    name: string;
    email: string;
    password: string;
    avatar?: string;
}

export const registerUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {

    try {
        const { name, email, password } = req.body;

        // Check if email already exists
        const isEmailExist = await userModel.findOne({ email });
        if (isEmailExist) {
            return next(new ErrorHandler("Email already exists", 400));
        }

        const user: IRegistrationBody = { name, email, password };
        const activationToken = createActivationToken(user);

        const activationCode = activationToken.activationCode;
        const data = { user: { name: user.name }, activationCode };

        // Send activation email
        try {
            await sendEmail({
                email: user.email,
                subject: "Activate your account",
                template: "activation.mail.ejs",
                data,
            });

            res.json({
                success: true,
                message: `Please check your email: ${user.email} to activate your account!`,
                activationToken: activationToken.token,
            });
        } catch (error: any) {
            console.error("Failed to send activation email:", error);
            return next(new ErrorHandler("Failed to send activation email", 500));
        }
    } catch (error: any) {
        console.error("Error in registerUser:", error);
        return next(new ErrorHandler(error.message, 400));
    }
});

// Activation token creation
interface IActivationToken {
    token: string;
    activationCode: string;
}

export const createActivationToken = (user: any): IActivationToken => {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

    const token = sign(
        {
            user,
            activationCode,
        },
        process.env.ACTIVATION_SECRET as Secret,
        { expiresIn: "5m" }
    );

    return { token, activationCode };
};


//activate user
interface IActivationRequest {
    activation_token: string;
    activation_code: string;
};


export const activateUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { activation_token, activation_code } = req.body as IActivationRequest;

        const newUser: { user: IUser; activationCode: string } = verify(
            activation_token,
            process.env.ACTIVATION_SECRET as string,
        ) as { user: IUser; activationCode: string };

        if (newUser.activationCode !== activation_code) {
            return next(new ErrorHandler("Invalid activation code", 400));
        };

        const { name, email, password } = newUser.user;

        const existUser = await userModel.findOne({ email });
        if (existUser) {
            return next(new ErrorHandler("Email already exists", 400));
        };

        const user = await userModel.create({ name, email, password });
        res.status(201).json({
            success: true,
            message: "User created successfully",
            user,
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

//  user login 
interface ILoginRequest {
    email: string;
    password: string;
}

export const loginUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    console.log("request received from client side for login user")
    try {
        const { email, password } = req.body as ILoginRequest;

        const user = await userModel.findOne({ email }).select("+password");


        if (!email || !password) {
            return next(new ErrorHandler("Please enter email and password", 400));
        }

        if (!user) {
            return next(new ErrorHandler("Invalid email or password", 401));
        };

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return next(new ErrorHandler("Invalid email or password", 401));
        };

        sendToken(user, 200, res);

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
})

// logout user
export const logoutUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.cookie("accessToken", "", { maxAge: 1 });
        res.cookie("refreshToken", "", { maxAge: 1 });

        const userId = req.user?._id?.toString() || "";
        redis.del(userId)

        res.status(200).json({
            success: true,
            message: "Logout successfully",
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});


// validate user roles

export const authorizeRoles = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!roles.includes(req.user?.role || "")) {
            return next(new ErrorHandler(`Role: ${req.user?.role} is not allowed to access this resource`, 403));
        }
        next();
    }
};

// update access token

export const updateAccessToken = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refresh_token = req.cookies.refreshToken as string;
        const decoded = verify(refresh_token, process.env.REFRESH_TOKEN as string) as JwtPayload;
        const message = "Could not verify refresh token";
        if (!decoded) {
            return next(new ErrorHandler(message, 400));
        };

        const session = await redis.get(decoded.id as string);
        if (!session) {
            return next(new ErrorHandler("Please login for access this resources", 400));
        };

        const user = JSON.parse(session);
        const accessToken = sign({
            id: user._id,
        }, process.env.ACCESS_TOKEN as string, { expiresIn: "5m" });

        const refreshToken = sign({
            id: user._id,
        }, process.env.REFRESH_TOKEN as string, { expiresIn: "7d" });

        req.user = user;
        res.cookie("accessToken", accessToken, accessTokenOptions);
        res.cookie("refreshToken", refreshToken, refreshTokenOptions);
        await redis.set(user._id,JSON.stringify(user),"EX",604800);  // 7 days from now
        // Sending response
        res.status(200).json({
            success: true,
            accessToken,
            refreshToken,
        });

    } catch (error) {
        return next(new ErrorHandler("Invalid refresh token", 401));
    }
});


// get user info
export const getUserInfo = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?._id?.toString() || "";
        await getUserById(userId, res);

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));

    }
});


// social auth

interface ISocialAuthBody {
    name: string;
    email: string;
    avatar: string;
}

export const socialAuth = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, avatar } = req.body as ISocialAuthBody;

        const user = await userModel.findOne({ email });

        if (!user) {
            const newUser = await userModel.create({ name, email, avatar });
            sendToken(newUser, 200, res);
        } else {
            sendToken(user, 200, res);
        }
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});


// UPDATE USER INFO 

interface IUpdateUserInfo {
    name?: string;
    email?: string;
}

export const updateUserInfo = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name } = req.body as IUpdateUserInfo;
        const userId = req.user?._id?.toString() || "";
        const user = await userModel.findById(userId);

        if (user && name) {
            user.name = name;
        };
        await user?.save();
        await redis.set(userId, JSON.stringify(user));
        res.status(200).json({
            success: true,
            message: "User info updated successfully",
            user,
        });


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

// update user password

interface IUpdateUserPassword {
    oldPassword: string;
    newPassword: string;
};

export const updatePassword = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { oldPassword, newPassword } = req.body as IUpdateUserPassword;

        if (!oldPassword && !newPassword) {
            return next(new ErrorHandler("Please enter old and new password", 400));
        }

        const user = await userModel.findById(req.user?._id).select("+password");
        if (user?.password === undefined) {
            return next(new ErrorHandler("Invalid user", 400));
        };

        const isPasswordMatch = await user?.comparePassword(oldPassword);
        if (!isPasswordMatch) {
            return next(new ErrorHandler("Old password is incorrect", 400));
        };
        user.password = newPassword;
        await user?.save();
        await redis.set(req.user?._id as string, JSON.stringify(user));
        res.status(200).json({
            success: true,
            message: "Password updated successfully",
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

// update profile picture
interface IUpdateProfilePicture {
    avatar: string
}

export const updateProfilePicture = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { avatar } = req.body as IUpdateProfilePicture;
        const userId = req.user?._id;
        const user = await userModel.findById(userId);

        if (avatar && user) {
            // if user have one avatar already then delete it
            if (user.avatar.public_id) {
                // first delete the old avatar from cloudinary
                await cloudinary.v2.uploader.destroy(user.avatar.public_id);
                // then upload new avatar
                const myCloud = await cloudinary.v2.uploader.upload(avatar, {
                    folder: "avatars",
                    width: 150,
                });
                // update user avatar in  database
                user.avatar = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url,
                };


            }else{
                // if user have no avatar then upload it
                const myCloud = await cloudinary.v2.uploader.upload(avatar, {
                    folder: "avatars",
                    width: 150,
                });
                // update user avatar in  database
                user.avatar = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url,
                }
            }
        };
        // save user in database
        await user?.save();
        // update user in redis
        await redis.set(userId as string, JSON.stringify(user));
        // send response to client
        res.status(200).json({
            success: true,
            message: "Profile picture updated successfully",
            user,
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});


// get all users only for admin 

export const getAllUsers = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        getAllUsersService(res);
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});


// update users only for admin
export const updateUserRole = CatchAsyncError(async (req: Request, res : Response, next: NextFunction) => {
    try {
        const {id,role} = req.body;
        updateUserRoleService(res,id,role);
    } catch (error:any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

// delete user only for admin

export const deleteUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {id} = req.params;
        const user = await userModel.findById(id);
        if(!user){
            return next(new ErrorHandler("User not found", 404));
        };

        await user.deleteOne({id});
        await redis.del(id);
        // delete user avatar from cloudinary
        
        res.status(200).json({
            success: true,
            message: "User deleted successfully",
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});