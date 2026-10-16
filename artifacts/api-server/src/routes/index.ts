import { Router, type IRouter } from "express";
import healthRouter from "./health";
import coursesRouter from "./courses";
import assignmentsRouter from "./assignments";
import toneRouter from "./tone";
import demoRouter from "./demo";
import aiRouter from "./ai";
import stripeRouter from "./stripe";

const router: IRouter = Router();

router.use(healthRouter);
router.use(coursesRouter);
router.use(assignmentsRouter);
router.use(toneRouter);
router.use(demoRouter);
router.use(aiRouter);
router.use(stripeRouter);

export default router;
