import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import router from './routes/router.js';
import connectDB from './config/db.js';
import { startReminderWorker } from './jobs/reminderJob.js';

dotenv.config();

const app = express();

// Configuración de CORS más permisiva para desarrollo
const allowedOrigins = [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:5173', // Vite dev por defecto
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
];

// Agregar orígenes adicionales desde .env si existen
if (process.env.FRONTEND_ORIGINS) {
    const customOrigins = process.env.FRONTEND_ORIGINS
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean);
    allowedOrigins.push(...customOrigins);
}

app.use(cors({
    origin: (origin, callback) => {
        // Permitir solicitudes sin origin (como Postman, aplicaciones móviles, etc.)
        if (!origin) {
            return callback(null, true);
        }
        
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        console.warn(`CORS bloqueó solicitud desde origen no permitido: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Set-Cookie'],
    optionsSuccessStatus: 200,
    preflightContinue: false
}));

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));
app.use(cookieParser());

// Servir archivos estáticos desde la carpeta uploads
app.use('/uploads', express.static('uploads'));

// Middleware de debugging para ver todas las requests POST a /api/pruebas
app.use((req, res, next) => {
    if (req.method === 'POST' && req.path.startsWith('/api/pruebas')) {
        console.log(`\n📡 [${req.method}] ${req.path}`);
        console.log(`   URL completa: ${req.originalUrl}`);
    }
    next();
});

app.use('/api', router);

connectDB();

// Iniciar worker de recordatorios (consulta periódica) sólo si no es entorno de test
if (process.env.NODE_ENV !== 'test') {
    startReminderWorker();
}

const PORT = process.env.PORT || 5500;
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT,  () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

export default app;
