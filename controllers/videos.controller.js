// controllers/videos.controller.js

import { VideosService } from "../services/videosService.js";

export const VideosController = {
   getByModule: async (req, res) => {
      const startedAt = Date.now();
      try {
         const { slug } = req.params;
         console.error("\x1b[35m", "[VideosController.getByModule] => slug:", slug);
         const data = await VideosService.getByModuleSlug(slug);
         if (!data) {
            console.error("\x1b[33m", "[VideosController.getByModule] 404 — módulo no encontrado:", slug);
            return res.status(404).json({ success: false, message: "Módulo no encontrado" });
         }
         console.error(
            "\x1b[32m",
            `[VideosController.getByModule] 200 — slug:${slug} videos:${data.videos.length} (${Date.now() - startedAt}ms)`,
         );
         res.json({ success: true, ...data });
      } catch (err) {
         console.error("\x1b[31m", "[VideosController.getByModule] Error:", err);
         res.status(500).json({
            success: false,
            message: "Error al consultar videos",
         });
      }
   },
};
