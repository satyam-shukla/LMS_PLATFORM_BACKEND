import { Request } from "express";
import { IUser } from "../Models/user.model";


declare global {
    namespace Express {
        interface Request {
            user?: IUser
        }
    }
}