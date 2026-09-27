import { Router } from 'express';
import * as ctrl from './catalog.controller.js';

export const catalogRouter = Router();
catalogRouter.get('/', ctrl.list);

export default catalogRouter;
