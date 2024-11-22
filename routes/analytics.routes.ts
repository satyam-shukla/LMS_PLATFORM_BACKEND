import express from 'express';
import { isAuthenticateUser } from '../MiddleWare/auth';
import { authorizeRoles } from '../controllers/user.controller';
import { getCoursesAnalytics, getOrderAnalytics, getUserAnalytics } from '../controllers/analytics.controller';
const  analyticsRouter = express.Router();


analyticsRouter.get('/get-user-analytics',isAuthenticateUser,authorizeRoles("admin"),getUserAnalytics);
analyticsRouter.get('/get-courses-analytics',isAuthenticateUser,authorizeRoles("admin"),getCoursesAnalytics);
analyticsRouter.get('/get-orders-analytics',isAuthenticateUser,authorizeRoles("admin"),getOrderAnalytics);

export default analyticsRouter;