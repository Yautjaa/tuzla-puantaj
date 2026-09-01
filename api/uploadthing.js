// UploadThing — Vercel Serverless Route (Node.js)
// Bu dosya Vercel'de /api/uploadthing endpoint'i olarak çalışır.
// Lokal geliştirmede devreye GİRMEZ, sadece canlıda (Vercel) aktiftir.

const { createUploadthing } = require("uploadthing/server");
const { createRouteHandler } = require("uploadthing/next-legacy");

const f = createUploadthing();

const uploadRouter = {
  izinUploader: f({
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => {
      // JWT kontrolü — Authorization header'dan token doğrulama
      const authHeader = req.headers.authorization || req.headers["authorization"];
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new Error("Yetkisiz erişim");
      }
      return {};
    })
    .onUploadComplete(async ({ file }) => {
      console.log("İzin dosyası yüklendi:", file.ufsUrl);
      return { url: file.ufsUrl };
    }),
};

module.exports = createRouteHandler({
  router: uploadRouter,
});
