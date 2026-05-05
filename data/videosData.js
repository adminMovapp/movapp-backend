// data/videosData.js
// Fuente de verdad de los videos por módulo. Servida por GET /videos/:slug.
// Sin tabla en DB por ahora; cuando se migre, sólo cambia el DAO.

export const VIDEOS_DATA = [
   {
      slug: "home",
      nombre: "Inicio",
      descripcion: "Banner principal de la pantalla de inicio",
      activo: true,
      videos: [{ id: 1, videoId: "1147159129", orden: 0, activo: true }],
   },
   {
      slug: "mind",
      nombre: "Mente Digital",
      descripcion: "Videos sobre bienestar mental digital",
      activo: true,
      videos: [
         { id: 1, videoId: "1164577391", orden: 0, activo: true },
         { id: 2, videoId: "1164575176", orden: 1, activo: true },
         { id: 3, videoId: "1164576426", orden: 2, activo: true },
         { id: 4, videoId: "1165530376", orden: 3, activo: true },
         { id: 5, videoId: "1165531010", orden: 4, activo: true },
         { id: 6, videoId: "1165531039", orden: 5, activo: true },
         { id: 7, videoId: "1165531088", orden: 6, activo: true },
         { id: 8, videoId: "1165547099", orden: 7, activo: true },
         { id: 9, videoId: "1165547542", orden: 8, activo: true },
         { id: 10, videoId: "1165547598", orden: 9, activo: true },
      ],
   },
   {
      slug: "collaborations",
      nombre: "Testimonios",
      descripcion: "Colaboraciones y testimonios de usuarios",
      activo: true,
      videos: [
         { id: 1, videoId: "1166399438", orden: 0, activo: true },
         { id: 2, videoId: "1166399565", orden: 1, activo: true },
         { id: 3, videoId: "1166404006", orden: 2, activo: true },
         { id: 4, videoId: "1166404194", orden: 3, activo: true },
         { id: 5, videoId: "1166404382", orden: 4, activo: true },
         { id: 6, videoId: "1166404548", orden: 5, activo: true },
         { id: 7, videoId: "1166404748", orden: 6, activo: true },
         { id: 8, videoId: "1166404979", orden: 7, activo: true },
         { id: 9, videoId: "1166405267", orden: 8, activo: true },
         { id: 10, videoId: "1166405419", orden: 9, activo: true },
         { id: 11, videoId: "1166405577", orden: 10, activo: true },
         { id: 12, videoId: "1166405733", orden: 11, activo: true },
         { id: 13, videoId: "1166405909", orden: 12, activo: true },
      ],
   },
];
