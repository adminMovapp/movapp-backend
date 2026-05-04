// routes/videos.js
import express from "express";
import { VideosController } from "../controllers/videos.controller.js";
import validateVideosSchema from "../middlewares/validateVideos.js";

const router = express.Router();

router.get("/:slug", validateVideosSchema.getByModule, VideosController.getByModule);

export default router;
