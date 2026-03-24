// Existing content of server.ts file before the changes
// Your existing imports and code here...

import csrf from 'csurf'; // New CSRF import

// Place it after cookieParser middleware
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection); // New CSRF protection middleware

// Place it after app.use('/api/v1', apiRoutes)
app.get('/api/v1/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
}); // New CSRF token endpoint

// Existing content of server.ts file after the changes