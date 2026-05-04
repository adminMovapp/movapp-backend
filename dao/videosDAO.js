// dao/videosDAO.js
import { VIDEOS_DATA } from "../data/videosData.js";

export const VideosDAO = {
   /**
    * Devuelve el módulo activo con sus videos activos (ordenados por `orden`),
    * o null si el slug no existe o el módulo está inactivo.
    */
   getModuleWithVideos: (slug) => {
      console.error("\x1b[34m", "[VideosDAO.getModuleWithVideos] => slug:", slug);
      const modulo = VIDEOS_DATA.find((m) => m.slug === slug && m.activo);
      if (!modulo) {
         console.error("\x1b[33m", "[VideosDAO.getModuleWithVideos] sin match para slug:", slug);
         return null;
      }
      const videos = modulo.videos
         .filter((v) => v.activo)
         .slice()
         .sort((a, b) => a.orden - b.orden);
      console.error(
         "\x1b[34m",
         `[VideosDAO.getModuleWithVideos] match — slug:${modulo.slug} totalVideos:${modulo.videos.length} activos:${videos.length}`,
      );
      return { modulo, videos };
   },
};
