const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const releaseRoutes = require('./routes/release.routes');
const problemRoutes = require('./routes/problem.routes');
const sharedRoutes = require('./routes/shared.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/release', releaseRoutes);
app.use('/api/problem', problemRoutes);
app.use('/api/shared', sharedRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta nije pronadjena.' });
});

app.use(errorHandler);

module.exports = app;
