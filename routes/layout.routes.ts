import express from 'express';
import { isAuthenticateUser } from '../MiddleWare/auth';
import { authorizeRoles } from '../controllers/user.controller';
import { createLayout, editLayout, getLayoutByType } from '../controllers/layout.controller';

const LayoutRouter = express.Router();



LayoutRouter.post("/create-layout",isAuthenticateUser,authorizeRoles("admin"),createLayout);
LayoutRouter.put("/edit-layout",isAuthenticateUser,authorizeRoles("admin"),editLayout);
LayoutRouter.get("/get-layout",isAuthenticateUser,getLayoutByType);


export default LayoutRouter;