import express from "express";
import { activateUser, authorizeRoles, deleteUser, getAllUsers, getUserInfo, loginUser, logoutUser, registerUser, socialAuth, updateAccessToken, updatePassword, updateProfilePicture, updateUserInfo, updateUserRole, } from "../controllers/user.controller"
import { isAuthenticateUser } from "../MiddleWare/auth";

const userRouter = express.Router();
userRouter.post('/registration', registerUser);
userRouter.post('/activate-user', activateUser);
userRouter.post('/login', loginUser);
userRouter.get('/logout', isAuthenticateUser, logoutUser);
userRouter.get('/refresh', updateAccessToken);
userRouter.get('/me', isAuthenticateUser, getUserInfo);
userRouter.post('/social-auth', socialAuth);
userRouter.put('/update-user-info',isAuthenticateUser, updateUserInfo);
userRouter.put('/update-user-password',isAuthenticateUser,updatePassword );
userRouter.put('/update-user-avatar',isAuthenticateUser,updateProfilePicture );
userRouter.get('/get-user',isAuthenticateUser,authorizeRoles("admin"),getAllUsers );
userRouter.put('/update-user',isAuthenticateUser,authorizeRoles("admin"),updateUserRole );
userRouter.delete('/delete-user/:id',isAuthenticateUser,authorizeRoles("admin"),deleteUser );

export default userRouter;