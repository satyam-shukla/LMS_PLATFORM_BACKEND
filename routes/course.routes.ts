import express from 'express';
import { addAnswer, addQuestion, addRelyOnReview, addReview, deleteCourse, editCourse, getAllCourses, getAllCoursesAdmin, getCourseByUser, getSingleCourse, uploadCourse } from '../controllers/course.controller';
import { isAuthenticateUser } from '../MiddleWare/auth';
import { authorizeRoles } from '../controllers/user.controller';
const courseRouter = express.Router();

courseRouter.post('/create-course',isAuthenticateUser,authorizeRoles("admin"),uploadCourse);
courseRouter.put('/edit-course/:id',isAuthenticateUser,authorizeRoles("admin"),editCourse);
courseRouter.get('/get-course/:id',getSingleCourse);
courseRouter.get('/get-courses',getAllCourses);
courseRouter.get('/get-course-content/:id',isAuthenticateUser,getCourseByUser);
courseRouter.put('/add-question',isAuthenticateUser,addQuestion);
courseRouter.put('/add-answer',isAuthenticateUser,addAnswer);
courseRouter.put('/add-review/:id',isAuthenticateUser,addReview);
courseRouter.put('/add-reply',isAuthenticateUser,authorizeRoles("admin"),addRelyOnReview);
courseRouter.get('/get-courses',isAuthenticateUser,authorizeRoles("admin"),getAllCoursesAdmin);
courseRouter.delete('/delete-course/:id',isAuthenticateUser,authorizeRoles("admin"),deleteCourse);



export default courseRouter;