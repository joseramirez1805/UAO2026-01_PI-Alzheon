import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Usuario from '../models/usuario.js';
import * as authController from '../controllers/authController.js';
import * as pacienteController from '../controllers/pacienteController.js';
import * as cuidadorController from '../controllers/cuidadorController.js';
import * as medicoController from '../controllers/medicoController.js';
import * as pruebaController from '../controllers/pruebaController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Configurar __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar multer para usar memoria (no disco)
// Los archivos se suben directamente a Cloudflare R2
const storage = multer.memoryStorage();

// Multer para audios
const uploadAudio = multer({ 
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /audio\/(mpeg|mp3|wav|webm|ogg)/;
        if (allowedTypes.test(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no permitido. Solo archivos de audio.'));
        }
    }
});

// Multer para imágenes
const uploadImage = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /image\/(jpeg|jpg|png|gif|webp)/;
        if (allowedTypes.test(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no permitido. Solo imágenes.'));
        }
    }
});

// ========== RUTA DE PRUEBA ==========
router.get('/', (req, res) => {
    res.send('<h1>API Alzheon funcionando correctamente!</h1>');
});

// ========== RUTAS DE AUTENTICACIÓN ==========
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/verify', authController.verify);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/user', authMiddleware, authController.getUserInfo);

// ========== RUTAS DE USUARIOS ==========

// Registrar nuevo usuario
router.post('/usuarios', authController.register);

// Obtener todos los usuarios
router.get('/usuarios', authMiddleware, async (req, res) => {
    try {
        const usuarios = await Usuario.find()
            .select('-password')
            .populate('pacienteAsociado', 'nombre email')
            .populate('cuidadores', 'nombre email')
            .populate('pacientesAsignados', 'nombre email');
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener usuario por ID
router.get('/usuarios/:id', authMiddleware, async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.params.id)
            .select('-password')
            .populate('pacienteAsociado', 'nombre email')
            .populate('cuidadores', 'nombre email')
            .populate('pacientesAsignados', 'nombre email');
        
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json(usuario);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Actualizar usuario
router.put('/usuarios/:id', authMiddleware, async (req, res) => {
    try {
        const usuario = await Usuario.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json(usuario);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Eliminar usuario
router.delete('/usuarios/:id', authMiddleware, async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.params.id);
        
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        // Limpiar relaciones antes de eliminar
        if (usuario.rol === 'cuidador/familiar' && usuario.pacienteAsociado) {
            await Usuario.findByIdAndUpdate(
                usuario.pacienteAsociado,
                { $pull: { cuidadores: usuario._id } }
            );
        }
        
        if (usuario.rol === 'paciente') {
            // Eliminar referencia de cuidadores
            await Usuario.updateMany(
                { pacienteAsociado: usuario._id },
                { $unset: { pacienteAsociado: 1 } }
            );
        }
        
        await Usuario.findByIdAndDelete(req.params.id);
        res.json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== RUTAS ESPECÍFICAS DE RELACIONES ==========

// Asignar cuidador a paciente
router.post('/usuarios/:pacienteId/cuidadores/:cuidadorId', authMiddleware, async (req, res) => {
    try {
        const paciente = await Usuario.findById(req.params.pacienteId);
        const cuidador = await Usuario.findById(req.params.cuidadorId);
        
        if (!paciente || paciente.rol !== 'paciente') {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }
        
        if (!cuidador || cuidador.rol !== 'cuidador/familiar') {
            return res.status(404).json({ error: 'Cuidador no encontrado' });
        }
        
        // Actualizar cuidador
        cuidador.pacienteAsociado = paciente._id;
        await cuidador.save();
        
        // Actualizar paciente
        if (!paciente.cuidadores.includes(cuidador._id)) {
            paciente.cuidadores.push(cuidador._id);
            await paciente.save();
        }
        
        res.json({ message: 'Cuidador asignado correctamente', paciente, cuidador });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener cuidadores de un paciente
router.get('/usuarios/:pacienteId/cuidadores', authMiddleware, async (req, res) => {
    try {
        const paciente = await Usuario.findById(req.params.pacienteId)
            .populate('cuidadores', 'nombre email');
        
        if (!paciente || paciente.rol !== 'paciente') {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }
        
        res.json(paciente.cuidadores);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Asignar paciente a médico
router.post('/usuarios/:medicoId/pacientes/:pacienteId', authMiddleware, async (req, res) => {
    try {
        const medico = await Usuario.findById(req.params.medicoId);
        const paciente = await Usuario.findById(req.params.pacienteId);
        
        if (!medico || medico.rol !== 'medico') {
            return res.status(404).json({ error: 'Médico no encontrado' });
        }
        
        if (!paciente || paciente.rol !== 'paciente') {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }
        
        // Actualizar relación bidireccional
        if (!medico.pacientesAsignados.includes(paciente._id)) {
            medico.pacientesAsignados.push(paciente._id);
            await medico.save();
        }

        // Actualizar relación inversa en el paciente
        if (!paciente.medicosAsignados.includes(medico._id)) {
            paciente.medicosAsignados.push(medico._id);
            await paciente.save();
        }
        
        res.json({ message: 'Paciente asignado correctamente', medico });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener pacientes asignados a un médico
router.get('/usuarios/:medicoId/pacientes', authMiddleware, async (req, res) => {
    try {
        const medico = await Usuario.findById(req.params.medicoId)
            .populate('pacientesAsignados', 'nombre email');
        
        if (!medico || medico.rol !== 'medico') {
            return res.status(404).json({ error: 'Médico no encontrado' });
        }
        
        res.json(medico.pacientesAsignados);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener usuarios por rol
router.get('/usuarios/rol/:rol', authMiddleware, async (req, res) => {
    try {
        const { rol } = req.params;
        const usuarios = await Usuario.find({ rol })
            .select('-password')
            .populate('pacienteAsociado', 'nombre email')
            .populate('cuidadores', 'nombre email')
            .populate('pacientesAsignados', 'nombre email');
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== RUTAS DEL PACIENTE ==========

// Obtener fotos del paciente
router.get('/paciente/fotos', 
    authMiddleware, 
    requireRole('paciente'), 
    pacienteController.getPatientPhotos
);

// Subir grabación de audio
router.post('/paciente/grabar', 
    authMiddleware, 
    requireRole('paciente'),
    uploadAudio.single('audio'),
    pacienteController.uploadRecording
);

// Obtener grabaciones del paciente
router.get('/paciente/grabaciones', 
    authMiddleware, 
    requireRole('paciente'),
    pacienteController.getPatientRecordings
);

// Obtener configuración del paciente
router.get('/paciente/configuracion', 
    authMiddleware, 
    requireRole('paciente'),
    pacienteController.getPatientSettings
);

// Actualizar configuración de recordatorios
router.put('/paciente/configuracion', 
    authMiddleware, 
    requireRole('paciente'),
    pacienteController.updatePatientSettings
);

// Actualizar perfil del paciente
router.put('/paciente/perfil', 
    authMiddleware, 
    requireRole('paciente'),
    pacienteController.updatePatientProfile
);

// Cambiar contraseña del paciente
router.put('/paciente/perfil/password', 
    authMiddleware, 
    requireRole('paciente'),
    pacienteController.updatePatientPassword
);

// ========== RUTAS DEL CUIDADOR ==========

// Obtener paciente asociado
router.get('/cuidador/paciente',
    authMiddleware,
    requireRole('cuidador/familiar'),
    cuidadorController.getAssociatedPatient
);

// Obtener fotos del paciente
router.get('/cuidador/fotos',
    authMiddleware,
    requireRole('cuidador/familiar'),
    cuidadorController.getPatientPhotos
);

// Crear nueva foto para el paciente (con imagen o URL)
router.post('/cuidador/fotos',
    authMiddleware,
    requireRole('cuidador/familiar'),
    uploadImage.single('image'), // Opcional: si no hay imagen, acepta URL
    cuidadorController.createPatientPhoto
);

// Actualizar foto
router.put('/cuidador/fotos/:photoId',
    authMiddleware,
    requireRole('cuidador/familiar'),
    uploadImage.single('image'), // opcionalmente reemplazar la imagen existente
    cuidadorController.updatePatientPhoto
);

// Eliminar foto
router.delete('/cuidador/fotos/:photoId',
    authMiddleware,
    requireRole('cuidador/familiar'),
    cuidadorController.deletePatientPhoto
);

// Obtener grabaciones del paciente
router.get('/cuidador/grabaciones',
    authMiddleware,
    requireRole('cuidador/familiar'),
    cuidadorController.getPatientRecordings
);

// Obtener grabaciones con análisis cognitivo (para línea de tiempo)
router.get('/cuidador/grabaciones-con-analisis',
    authMiddleware,
    requireRole('cuidador/familiar'),
    cuidadorController.getRecordingsWithAnalysis
);

// Obtener estadísticas del paciente
router.get('/cuidador/estadisticas',
    authMiddleware,
    requireRole('cuidador/familiar'),
    cuidadorController.getPatientStats
);

// Obtener pruebas cognitivas del paciente asociado
router.get('/cuidador/pruebas-cognitivas',
    authMiddleware,
    requireRole('cuidador/familiar'),
    cuidadorController.getPatientCognitivePruebas
);

// Eliminar una prueba cognitiva del paciente
router.delete('/cuidador/pruebas-cognitivas/:pruebaId',
    authMiddleware,
    requireRole('cuidador/familiar'),
    cuidadorController.deletePatientCognitivePrueba
);

// ========== RUTAS DEL MÉDICO ==========

// Obtener estadísticas generales del médico
router.get('/medico/estadisticas',
    authMiddleware,
    requireRole('medico'),
    medicoController.getDoctorStats
);

// Obtener todos los pacientes asignados al médico
router.get('/medico/pacientes',
    authMiddleware,
    requireRole('medico'),
    medicoController.getAssignedPatients
);

// Obtener todos los pacientes disponibles para asignar
router.get('/medico/pacientes/disponibles',
    authMiddleware,
    requireRole('medico'),
    medicoController.getAllPatients
);

// Obtener detalles de un paciente específico
router.get('/medico/pacientes/:pacienteId',
    authMiddleware,
    requireRole('medico'),
    medicoController.getPatientDetails
);

// Obtener fotos de un paciente
router.get('/medico/pacientes/:pacienteId/fotos',
    authMiddleware,
    requireRole('medico'),
    medicoController.getPatientPhotos
);

// Obtener grabaciones de un paciente
router.get('/medico/pacientes/:pacienteId/grabaciones',
    authMiddleware,
    requireRole('medico'),
    medicoController.getPatientRecordings
);

// Asignar paciente al médico
router.post('/medico/pacientes',
    authMiddleware,
    requireRole('medico'),
    medicoController.assignPatient
);

// Desasignar paciente del médico
router.delete('/medico/pacientes/:pacienteId',
    authMiddleware,
    requireRole('medico'),
    medicoController.unassignPatient
);

// Actualizar información de un paciente
router.put('/medico/pacientes/:pacienteId',
    authMiddleware,
    requireRole('medico'),
    medicoController.updatePatientInfo
);

// Obtener todos los cuidadores disponibles
router.get('/medico/cuidadores',
    authMiddleware,
    requireRole('medico'),
    medicoController.getAvailableCaregivers
);

// Asignar cuidador a paciente
router.post('/medico/asignar-cuidador',
    authMiddleware,
    requireRole('medico'),
    medicoController.assignCaregiverToPatient
);

// ========== RUTAS DE ANÁLISIS COGNITIVO (HU-03 y HU-04) ==========

// Obtener línea base cognitiva de un paciente
router.get('/medico/pacientes/:pacienteId/linea-base',
    authMiddleware,
    requireRole('medico'),
    medicoController.getLineaBase
);

// Obtener historial de análisis cognitivos
router.get('/medico/pacientes/:pacienteId/analisis',
    authMiddleware,
    requireRole('medico'),
    medicoController.getAnalisisCognitivo
);

// Obtener alertas cognitivas no leídas
router.get('/medico/alertas',
    authMiddleware,
    requireRole('medico'),
    medicoController.getAlertas
);

// Obtener historial de alertas con filtros
router.get('/medico/alertas/historial',
    authMiddleware,
    requireRole('medico'),
    medicoController.getHistorialAlertas
);

// Marcar alerta como leída
router.post('/medico/alertas/:alertaId/leer',
    authMiddleware,
    requireRole('medico'),
    medicoController.marcarAlertaLeida
);

// Registrar acción sobre una alerta
router.post('/medico/alertas/:alertaId/accion',
    authMiddleware,
    requireRole('medico'),
    medicoController.registrarAccionAlerta
);

// Actualizar umbrales de configuración
router.put('/medico/configuracion/umbrales',
    authMiddleware,
    requireRole('medico'),
    medicoController.actualizarUmbrales
);

// Generar reporte completo de un paciente
router.get('/medico/pacientes/:pacienteId/reporte',
    authMiddleware,
    requireRole('medico'),
    medicoController.generarReporte
);

// ========== RUTAS DE PRUEBAS COGNITIVAS (PACIENTE) ==========

// Iniciar nueva prueba cognitiva
router.post('/pruebas/iniciar',
    authMiddleware,
    requireRole('paciente'),
    pruebaController.iniciarPrueba
);

// Registrar que vio la primera secuencia de imágenes
router.post('/pruebas/:pruebaId/primera-secuencia',
    authMiddleware,
    requireRole('paciente'),
    pruebaController.registrarPrimeraSecuencia
);

// Guardar respuesta verbal (solo texto)
router.post('/pruebas/:pruebaId/respuesta-verbal',
    (req, res, next) => {
        console.log(`🚀 POST /api/pruebas/:pruebaId/respuesta-verbal`);
        console.log(`   - pruebaId: ${req.params.pruebaId}`);
        console.log(`   - URL completa: ${req.originalUrl}`);
        next();
    },
    authMiddleware,
    requireRole('paciente'),
    pruebaController.guardarRespuestaVerbal
);

// Registrar que vio la segunda secuencia de imágenes
router.post('/pruebas/:pruebaId/segunda-secuencia',
    authMiddleware,
    requireRole('paciente'),
    pruebaController.registrarSegundaSecuencia
);

// Finalizar prueba con ordenamiento de imágenes
router.post('/pruebas/:pruebaId/finalizar',
    authMiddleware,
    requireRole('paciente'),
    pruebaController.finalizarPrueba
);

// Abandonar prueba en progreso
router.post('/pruebas/:pruebaId/abandonar',
    authMiddleware,
    requireRole('paciente'),
    pruebaController.abandonarPrueba
);

// Obtener una prueba específica
router.get('/pruebas/:pruebaId',
    authMiddleware,
    requireRole('paciente'),
    pruebaController.obtenerPrueba
);

// Obtener historial de pruebas
router.get('/pruebas/historial',
    authMiddleware,
    requireRole('paciente'),
    pruebaController.obtenerHistorialPruebas
);

// Obtener estadísticas de pruebas
router.get('/pruebas/estadisticas',
    authMiddleware,
    requireRole('paciente'),
    pruebaController.obtenerEstadisticasPruebas
);

export default router;