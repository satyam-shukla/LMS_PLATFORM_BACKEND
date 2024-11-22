import { Response } from "express";
import courseModel from "../Models/course.model";
import { CatchAsyncError } from "../MiddleWare/catchAsyncError";


// create a new Course

export const createCourse = CatchAsyncError(async (data: any, res: Response) => {
    const course = await courseModel.create(data);
    res.status(201).json({
        success: true,
        course
    });
});



// get all courses

export const getAllCoursesService = async (res: Response) => {
    const courses = await courseModel.find().sort({createdAt:-1});
    if(courses){
        return res.status(200).json({
            success: true,
            courses,
        });
    };

};

