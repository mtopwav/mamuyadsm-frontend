// Local dev only: forwards /api from the React dev server to the Node backend on your machine.
const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: "http://localhost:5000",
      changeOrigin: true
    })
  );
};
