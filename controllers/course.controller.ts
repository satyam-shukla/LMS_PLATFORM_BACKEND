import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../MiddleWare/catchAsyncError";
import ErrorHandler from "../utils/ErrorHandler";
import cloudinary from "cloudinary";
import { createCourse, getAllCoursesService } from "../services/course.service";
import courseModel from "../Models/course.model";
import { redis } from "../utils/redis";
import mongoose from "mongoose";
import ejs from "ejs";
import path from "path";
import sendEmail from "../utils/sendmail";


// upload course

export const uploadCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const data = req.body;
        const thumbnail = data.thumbnail;
        if (thumbnail) {
            const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
                folder: "courses"
            });

            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url
            }

        };
        // this method is uploading the course
        createCourse(data, res, next)


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// edit course

export const editCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = req.body;
        const thumbnail = data.thumbnail;
        if (thumbnail) {
            await cloudinary.v2.uploader.destroy(thumbnail);

            const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
                folder: "courses"
            });

            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url
            }
        };

        const courseId = req.params.id

        const course = await courseModel.findByIdAndUpdate(courseId, { $set: data }, { new: true });
        res.status(200).json({
            success: true,
            course
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
});

// get single courses -------------------------------- without purchase

export const getSingleCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const courseId = req.params.id
        const isCacheExist = await redis.get(req.params.id);
        if (isCacheExist) {
            const course = JSON.parse(isCacheExist);
            return res.status(200).json({
                success: true,
                course
            });
        } else {
            const course = await courseModel.findById(req.params.id)
                .select("-courseData.videoUrl -courseData.suggestion -courseData.question -courseData.links");
            await redis.set(courseId, JSON.stringify(course),"EX",604800); // 7 days
            return res.status(200).json({
                success: true,
                course
            });
        };


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
});


// GET ALL COURSE WITHOUT purchase

export const getAllCourses = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const isCacheExist = await redis.get("allCourse");
        if (isCacheExist) {
            const courses = JSON.parse(isCacheExist);
            return res.status(200).json({
                success: true,
                courses
            });
        } else {
            const courses = await courseModel.find()
                .select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");

            await redis.set("allCourse", JSON.stringify(courses));

            res.status(200).json({
                success: true,
                courses
            });
        };

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});


// get course content only for valid user

export const getCourseByUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log("hitting in getCourseByUser")
        const userCourseList = req.user?.courses;

        const courseId = req.params.id;
        const courseExists = userCourseList?.find((course: any) => course._id.toString() === courseId);
        if (!courseExists) {
            return next(new ErrorHandler("You are not eligible for this course ", 404));
        };

        const course = await courseModel.findById(courseId)
        const courseContent = course?.courseData;
        res.status(200).json({
            success: true,
            courseContent
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// add question in the course

interface IAddQuestion {
    question: string;
    courseId: string;
    contentId: string;
}


export const addQuestion = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const { question, contentId, courseId }: IAddQuestion = req.body;
        const course = await courseModel.findById(courseId);
        // mongoose will return an empty array if the question is empty or not found in the database yet and we need 

        if (!mongoose.Types.ObjectId.isValid(contentId)) {
            return next(new ErrorHandler("Invalid contentId", 400));
        };

        const courseContent = course?.courseData?.find((item: any) => item._id.equals(contentId));
        if (!courseContent) {
            return next(new ErrorHandler("Invalid contentId", 400));
        };

        // then create a new question object 
        const newQuestion: any = {
            user: req.user,
            question,
            questionReplies: []
        };

        // add this question to our course content 
        courseContent.questions.push(newQuestion);
        // save our course content
        await course?.save();
        res.status(201).json({
            success: true,
            course
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
});

// add answers to the questions

interface IAddAnswer {
    answer: string;
    contentId: string;
    courseId: string;
    questionId: string;
};

export const addAnswer = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const { answer, contentId, courseId, questionId }: IAddAnswer = req.body;
        const course = await courseModel.findById(courseId);
        if (!mongoose.Types.ObjectId.isValid(contentId)) {
            return next(new ErrorHandler("Invalid contentId", 400));
        };

        const courseContent = course?.courseData?.find((item: any) => item._id.equals(contentId));
        if (!courseContent) {
            return next(new ErrorHandler("Invalid contentId", 400));
        };

        const question = courseContent?.questions?.find((item: any) => item._id.equals(questionId));
        if (!question) {
            return next(new ErrorHandler("Invalid questionId", 400));
        };

        // create a new answer object
        const newAnswer: any = {
            user: req.user,
            answer,
        };

        // add this answer to our question
        question.questionReplies?.push(newAnswer);
        await course?.save()

        if (req?.user?._id === question.user?._id) {
            console.log("req in admin session")
            // create a notification for admin if user ask a question 

        } else {
            // create a email notification for user if question is resolved 
            const data = {
                name: question.user.name,
                title: courseContent.title
            };


            const html = await ejs.renderFile(path.join(__dirname, '../mails/question-reply.ejs'), data);
            console.log(question.user.email)
            try {
                await sendEmail({
                    email: question.user.email,
                    subject: "Question reply",
                    template: "question-reply.ejs",
                    data
                })
            } catch (error: any) {
                return next(new ErrorHandler(error.message, 500))
            };
        };

        res.status(201).json({
            success: true,
            course
        });


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
});

// add review in a course

interface IAddReviewData {
    review: string;
    courseId: string;
    rating: number;
    userId: string;
};

export const addReview = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const userCourseList = req.user?.courses
        const courseId = req.params.id
        console.log(courseId, ":::::::::::::", userCourseList)
        const courseExists = userCourseList?.some((course: any) => course._id.toString() === courseId)
        if (!courseExists) {
            return next(new ErrorHandler("You are not eligible for this course ", 404));
        };

        const { review, rating }: IAddReviewData = req.body;
        const course = await courseModel.findById(courseId);
        const reviewData: any = {
            user: req.user,
            comment: review,
            rating
        };

        course?.reviews.push(reviewData);

        let avgRating = 0;

        course?.reviews.forEach((review: any) => {
            avgRating += review.rating
        })

        if (course) {
            course.ratings = avgRating / course.reviews.length
        }

        await course?.save();

        const notification = {
            title: "New review Received",
            message: `${req.user?.name} has given review on your ${course?.name}}`
        }

        //  create a notification message
        res.status(200).send({
            success: true,
            course
        });


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
});

// add rely on the review

interface IAddRelyOnReviewData {
    comment: string;
    courseId: string;
    reviewId: string;
};

export const addRelyOnReview = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const { comment, courseId, reviewId }: IAddRelyOnReviewData = req.body;
        const course = await courseModel.findById(courseId);
        if (!course) {
            return next(new ErrorHandler("Course not found", 404));
        };

        const review = course?.reviews?.find((item: any) => item._id.toString() === reviewId)

        if (!review) {
            return next(new ErrorHandler("Review not found", 404));
        };

        const replyData: any = {
            user: req.user,
            comment
        };

        review?.commentReplies?.push(replyData);

        if(!review.commentReplies){
            review.commentReplies = []
        }

        await course?.save();
        res.status(200).send({
            success: true,
            course
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
});


// get all course
export const getAllCoursesAdmin = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        getAllCoursesService(res);
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});


// delete course only for admin

export const deleteCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {id} = req.params;
        const user = await courseModel.findById(id);
        if(!user){
            return next(new ErrorHandler("Course not found", 404));
        };

        await user.deleteOne({id});
        await redis.del(id);
        // delete user avatar from cloudinary
        
        res.status(200).json({
            success: true,
            message: "Course deleted successfully",
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});