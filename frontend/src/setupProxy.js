const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/JokerApp',
    createProxyMiddleware({
      target: 'https://xelo.tools',
      changeOrigin: true,
    })
  );

  // Proxy for Facebook Graph API root path
  app.use(
    '/graph-api',
    createProxyMiddleware({
      target: 'https://graph.facebook.com',
      changeOrigin: true,
      secure: false,
      pathRewrite: {
        '^/graph-api': '' // remove the /graph-api prefix when forwarding
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
      },
      onProxyRes: function(proxyRes, req, res) {
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      },
    })
  );

  app.use(
    '/v18.0',
    createProxyMiddleware({
      target: 'https://graph.facebook.com',
      changeOrigin: true,
      secure: false,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
      },
      onProxyRes: function(proxyRes, req, res) {
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      },
    })
  );

  // For development: توجيه طلبات API إلى الخادم الخلفي
  // In production, these requests will go directly to the new backend domain
  const backendTarget = process.env.NODE_ENV === 'production' 
    ? 'https://api.xelo.tools' 
    : 'http://localhost:5000';
    
  app.use(
    '/api',
    createProxyMiddleware({
      target: backendTarget,
      changeOrigin: true,
      logLevel: 'silent',
    })
  );
  
  // توجيه طلبات الملفات المرفوعة إلى الخادم الخلفي
  app.use(
    '/uploads',
    createProxyMiddleware({
      target: backendTarget,
      changeOrigin: true,
      logLevel: 'silent',
    })
  );
  
  // توجيه طلبات المجلد العام إلى الخادم الخلفي
  app.use(
    '/public',
    createProxyMiddleware({
      target: backendTarget,
      changeOrigin: true,
      logLevel: 'silent',
    })
  );

  // *** حذف أو تعليق هذا الجزء المشكل ***
  /*
  app.use((req, res, next) => {
    if (req.url.includes('hot-update')) {
      next();
    } else if (!req.url.startsWith('/api')) {
      // هذا يوجه جميع الطلبات غير API إلى الخادم الخلفي!
      createProxyMiddleware({ 
        target: 'http://localhost:5000',
        changeOrigin: true,
        filter: (path) => {
          return path.startsWith('/api') || path.startsWith('/uploads');
        }
      })(req, res, next);
    } else {
      next();
    }
  });
  */
};