import express from 'express';
import { isAuthenticateUser } from '../MiddleWare/auth';
import { getNotifications, updateNotification } from '../controllers/notification.controller';
import { authorizeRoles } from '../controllers/user.controller';
const notificationRouter = express.Router();

notificationRouter.get('/get-all-notification',isAuthenticateUser,authorizeRoles("admin"),getNotifications)
notificationRouter.put('/update-notification/:id',isAuthenticateUser,authorizeRoles("admin"),updateNotification)

export default notificationRouter;