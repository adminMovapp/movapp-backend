// ============================================
// services/videosService.js
// Obtener listas de videos por módulo
// ============================================
import { VideosDAO } from "../dao/videosDAO.js";

export const VideosService = {
   /**
    * Devuelve { module, videos } o null si el módulo no existe / está inactivo.
    */
   async getByModuleSlug(slug) {
      console.error("\x1b[36m", "[VideosService.getByModuleSlug] => slug:", slug);
      const data = VideosDAO.getModuleWithVideos(slug);
      if (!data) {
         console.error("\x1b[33m", "[VideosService.getByModuleSlug] módulo no encontrado o inactivo:", slug);
         return null;
      }
      const { modulo, videos } = data;
      console.error(
         "\x1b[36m",
         `[VideosService.getByModuleSlug] OK — slug:${modulo.slug} nombre:"${modulo.nombre}" videos:${videos.length}`,
      );
      return {
         module: {
            slug: modulo.slug,
            nombre: modulo.nombre,
            descripcion: modulo.descripcion,
         },
         videos: videos.map((v) => ({
            id: v.id,
            videoId: v.videoId,
            orden: v.orden,
         })),
      };
   },
};
