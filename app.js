require('dotenv').config();
const express = require('express');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require("cookie-parser");
const path = require('path');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parsers
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Session — cookie-based, works on serverless (Vercel)
app.use(session({
  secret: process.env.SESSION_SECRET || 'ctf-infinity-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',
  },
}));

// Make session user available in all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.isAdmin = req.session.isAdmin || false;
  next();
});

// Routes
app.use('/', require('./routes/auth'));
app.use('/challenges', require('./routes/challenges'));
app.use('/lab', require('./routes/lab'));
app.use('/creator', require('./routes/creator'));
// app.use('/vuln', require('./routes/vulnerable')); // removed — lab is now creator-managed

// 404
app.use((req, res) => {
  res.status(404).render('error', { title: 'Not Found', message: 'Page not found.', code: 404 });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { title: 'Server Error', message: err.message || 'Something went wrong.', code: 500 });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚩 CTF INFINITY running at http://localhost:${PORT}`);
  console.log(`🔐 Admin portal: http://localhost:${PORT}/creator\n`);
});

module.exports = app;
