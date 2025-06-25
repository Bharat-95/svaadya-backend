const express = require('express');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/user')
const menuRoutes = require('./routes/Menu')
const promoRoutes = require('./routes/Promocode')
const paymentRoutes = require('./routes/Payment')

app.use('/auth', authRoutes);
app.use('/', userRoutes );
app.use('/', menuRoutes );
app.use('/', promoRoutes);
app.use('/', paymentRoutes);
app.get('/', (req, res) => {
  res.send('🚀 Welcome to Svaadya Server!');
});


app.listen(3000, () => console.log('Server running on port 3000'));
