const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const csurf = require('csurf');
const debug = require('debug');

require('dotenv').config();
require('./models/User');
require('./models/Review');
require('./models/Post');
require('./models/Cart');
require('./config/passport');

const passport = require('passport');
const { isProduction } = require('./config/keys');
const usersRouter = require('./routes/api/users');
const reviewsRouter = require('./routes/api/reviews');
const postsRouter = require('./routes/api/posts');

const app = express();

// Middleware setup
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(passport.initialize());

// CORS setup
if (!isProduction) {
  app.use(cors({
    origin: ['http://localhost:3000', 'https://ebike-emporium.onrender.com'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204,
  }));
}

// CSRF protection setup
app.use(
  csurf({
    cookie: {
      secure: isProduction,
      sameSite: 'Lax',
      httpOnly: true,
    },
  })
);

// API routes
app.use('/api/users', usersRouter);
app.use('/api/posts', postsRouter);
app.use('/api/reviews', reviewsRouter);

app.get('/api/csrf/restore', (req, res) => {
  res.json({ 'CSRF-Token': req.csrfToken() });
});

// Serve static files
if (isProduction) {
  app.use(express.static(path.resolve('./build')));

  app.get('/', (req, res) => {
    res.cookie('CSRF-Token', req.csrfToken());
    res.sendFile(path.resolve(__dirname, 'build', 'index.html'));
  });

  app.get(/^(?!\/?api).*/, (req, res) => {
    res.cookie('CSRF-Token', req.csrfToken());
    res.sendFile(path.resolve(__dirname, 'build', 'index.html'));
  });
}

// 404 error handler
app.use((req, res, next) => {
  const err = new Error('not found');
  err.statusCode = 404;
  next(err);
});

const serverErrorLogger = debug('backend:error');

// General error handler
app.use((err, req, res, next) => {
  serverErrorLogger(err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode);
  res.json({
    message: err.message,
    statusCode,
    errors: err.errors,
  });
});

module.exports = app;
