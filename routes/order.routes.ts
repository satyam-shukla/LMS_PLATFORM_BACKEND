import express from 'express';
import { isAuthenticateUser } from '../MiddleWare/auth';
import { createOrder, getAllOrders } from '../controllers/order.controller';
import { authorizeRoles } from '../controllers/user.controller';

const orderRouter = express.Router();

orderRouter.post('/order',isAuthenticateUser,createOrder)
orderRouter.get('/get-orders',isAuthenticateUser,authorizeRoles("admin"),getAllOrders)

export default orderRouter;