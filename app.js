const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const donorRoutes = require('./routes/donors');
const requestRoutes = require('./routes/requests');
const searchRoutes = require('./routes/search');
const adminRoutes = require('./routes/admin');
const campRoutes = require('./routes/camps');
const storyRoutes = require('./routes/stories');
const bloodBankRoutes = require('./routes/bloodBanks');

const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const requireDatabase = require('./middleware/dbMiddleware');

const app = express();

app.use(express.json({ limit: '8mb' }));
app.use(cors());

app.use('/api', requireDatabase);

app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/camps', campRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/blood-banks', bloodBankRoutes);
app.use('/api/bloodbanks', bloodBankRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'BloodBridge Emergency Blood Connector API' });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
