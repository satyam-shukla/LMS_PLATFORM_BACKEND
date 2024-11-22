require('dotenv').config()
import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from 'bcryptjs'
import { sign } from "jsonwebtoken";

const emailRegexPattern: RegExp = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export interface IUser extends Document {
    name: string
    email: string
    password: string
    role: string
    avatar: {
        public_id: string
        url: string
    }
    isVerified: boolean
    courses: Array<{ courseId: string }>
    comparePassword(password: string): Promise<boolean>
    SingAccessToken(): string
    SingRefreshToken(): string

}

const userSchema: Schema<IUser> = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please Enter Your Name"]
    },
    email: {
        type: String,
        required: [true, "Please Enter Your Email"],
        unique: true,
        match: [emailRegexPattern, "Please Enter a Valid Email"]
    },
    password: {
        type: String,
        minLength: [6, "Password must be at least 6 characters"],
        select: false
    },
    role: {
        type: String,
        default: "user"
    },
    avatar: {
        public_id: String,
        url: String
    },

    isVerified: {
        type: Boolean,
        default: false
    },
    courses: [{
        courseId: String
    }]
}, { timestamps: true })


// hash  password before  saving to database
userSchema.pre<IUser>("save", async function (next) {
    if (!this.isModified("password")) {
        next()
    }
    this.password = await bcrypt.hash(this.password, 10)
    next()
})

//sign access token
userSchema.methods.SingAccessToken = function (): String {
    return sign({ id: this._id }, process.env.ACCESS_TOKEN || "",{
        expiresIn:"5m"
    });
}

//sign refresh token
userSchema.methods.SingRefreshToken = function (): String {
    return sign({ id: this._id }, process.env.REFRESH_TOKEN || "",{
        expiresIn:"7d"
    });
}
    
//  compare password with hashed password
userSchema.methods.comparePassword = async function (enteredPassword: string): Promise<boolean> {
    return await bcrypt.compare(enteredPassword, this.password)
}

export const userModel: Model<IUser> = mongoose.model("User", userSchema);

export default userModel;
