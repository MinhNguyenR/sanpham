import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import { createAdminAccount } from './controllers/authController.js'; 

dotenv.config(); 

const app = express();

app.use(express.json()); 
app.use(cors()); 

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        await createAdminAccount();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1); 
    }
};

connectDB();

app.use('/api/auth', authRoutes); 
app.get('/', (req, res) => {
    res.send('API is running...');
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
