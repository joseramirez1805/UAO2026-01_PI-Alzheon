import Usuario from '../models/usuario.js';
import Foto from '../models/foto.js';
import Grabacion from '../models/grabacion.js';
import Configuracion from '../models/configuracion.js';
import AnalisisCognitivo from '../models/analisisCognitivo.js';
import AlertaCognitiva from '../models/alertaCognitiva.js';
import crypto from 'crypto';
import { generarReportePDF } from '../services/pdfReportService.js';

// Obtener todos los pacientes asignados al médico con estadísticas
export const getAssignedPatients = async (req, res) => {
    try {
        const medico = await Usuario.findById(req.usuario._id)
            .populate({
                path: 'pacientesAsignados',
                select: 'nombre email createdAt',
                populate: {
                    path: 'cuidadores',
                    select: 'nombre email'
                }
            });
        
        if (!medico || medico.rol !== 'medico') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        // Calcular inicio de semana
        const now = new Date();
        const firstDay = new Date(now);
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        firstDay.setDate(diff);
        firstDay.setHours(0, 0, 0, 0);

        // Agregar estadísticas a cada paciente
        const patientsWithStats = await Promise.all(
            medico.pacientesAsignados.map(async (paciente) => {
                const totalFotos = await Foto.countDocuments({ pacienteId: paciente._id });
                const totalGrabaciones = await Grabacion.countDocuments({ pacienteId: paciente._id });
                const grabacionesEstaSemana = await Grabacion.countDocuments({
                    pacienteId: paciente._id,
                    createdAt: { $gte: firstDay }
                });
                
                const configuracion = await Configuracion.findOne({ usuarioId: paciente._id });
                
                return {
                    ...paciente.toObject(),
                    estadisticas: {
                        totalFotos,
                        totalGrabaciones,
                        grabacionesEstaSemana,
                        metaSemanal: configuracion?.estadisticas?.metaSemanal || 7
                    }
                };
            })
        );

        res.json(patientsWithStats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener detalles de un paciente específico
export const getPatientDetails = async (req, res) => {
    try {
        const { pacienteId } = req.params;
        const medico = await Usuario.findById(req.usuario._id);
        
        if (!medico || medico.rol !== 'medico') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        // Verificar que el paciente esté asignado al médico
        if (!medico.pacientesAsignados.includes(pacienteId)) {
            return res.status(403).json({ error: 'No tienes acceso a este paciente' });
        }

        const paciente = await Usuario.findById(pacienteId)
            .select('-password')
            .populate('cuidadores', 'nombre email');
        
        if (!paciente || paciente.rol !== 'paciente') {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }

        // Obtener estadísticas completas del paciente
        const totalFotos = await Foto.countDocuments({ pacienteId });
        const totalGrabaciones = await Grabacion.countDocuments({ pacienteId });
        
        // Grabaciones esta semana
        const now = new Date();
        const firstDay = new Date(now);
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        firstDay.setDate(diff);
        firstDay.setHours(0, 0, 0, 0);
        
        const grabacionesEstaSemana = await Grabacion.countDocuments({
            pacienteId,
            createdAt: { $gte: firstDay }
        });

        // Última grabación
        const ultimaGrabacion = await Grabacion.findOne({ 
            pacienteId 
        }).sort({ createdAt: -1 });

        // Obtener configuración del paciente
        const configuracion = await Configuracion.findOne({ usuarioId: pacienteId });

        res.json({
            ...paciente.toObject(),
            estadisticas: {
                totalFotos,
                totalGrabaciones,
                grabacionesEstaSemana,
                metaSemanal: configuracion?.estadisticas?.metaSemanal || 7,
                sesionesCompletadas: configuracion?.estadisticas?.sesionesCompletadas || 0,
                ultimaGrabacion: ultimaGrabacion ? {
                    fecha: ultimaGrabacion.createdAt,
                    duracion: ultimaGrabacion.duracion
                } : null
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener fotos de un paciente
export const getPatientPhotos = async (req, res) => {
    try {
        const { pacienteId } = req.params;
        const medico = await Usuario.findById(req.usuario._id);
        
        if (!medico || medico.rol !== 'medico') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        if (!medico.pacientesAsignados.includes(pacienteId)) {
            return res.status(403).json({ error: 'No tienes acceso a este paciente' });
        }

        let fotos = await Foto.find({ pacienteId })
            .populate('cuidadorId', 'nombre email')
            .sort({ createdAt: -1 });

        fotos = fotos.map(f => {
            const obj = f.toObject();
            if (obj.imagen && obj.imagen.data) {
                const b64 = obj.imagen.data.toString('base64');
                obj.url_contenido = `data:${obj.imagen.contentType};base64,${b64}`;
                delete obj.imagen;
            }
            return obj;
        });

        res.json(fotos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener grabaciones de un paciente
export const getPatientRecordings = async (req, res) => {
    try {
        const { pacienteId } = req.params;
        const medico = await Usuario.findById(req.usuario._id);
        
        if (!medico || medico.rol !== 'medico') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        if (!medico.pacientesAsignados.includes(pacienteId)) {
            return res.status(403).json({ error: 'No tienes acceso a este paciente' });
        }

        const grabaciones = await Grabacion.find({ pacienteId })
            .populate('photoId', 'etiqueta url_contenido')
            .sort({ createdAt: -1 });

        const grabacionesFormateadas = grabaciones.map(grabacion => {
            let fotoUrl = grabacion.photoId?.url_contenido || '';
            // si la foto tiene binario en vez de URL, convertirlo
            if ((!fotoUrl || fotoUrl === '') && grabacion.photoId?.imagen?.data) {
                const b64 = grabacion.photoId.imagen.data.toString('base64');
                fotoUrl = `data:${grabacion.photoId.imagen.contentType};base64,${b64}`;
            }
            return {
                _id: grabacion._id,
                photoId: grabacion.photoId?._id,
                fotoUrl,
                fecha: grabacion.createdAt,
                duracion: grabacion.duracion,
                audioUrl: grabacion.audioUrl,
                nota: grabacion.nota,
                descripcionTexto: grabacion.descripcionTexto,
                transcripcion: grabacion.transcripcion,
                tipoContenido: grabacion.tipoContenido
            };
        });

        res.json(grabacionesFormateadas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Asignar paciente al médico
export const assignPatient = async (req, res) => {
    try {
        const { pacienteId } = req.body;
        const medico = await Usuario.findById(req.usuario._id);
        
        if (!medico || medico.rol !== 'medico') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        const paciente = await Usuario.findById(pacienteId);
        
        if (!paciente || paciente.rol !== 'paciente') {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }

        // Actualizar relación bidireccional
        if (!medico.pacientesAsignados.includes(pacienteId)) {
            medico.pacientesAsignados.push(pacienteId);
            await medico.save();
        }

        // Actualizar relación inversa en el paciente
        if (!paciente.medicosAsignados.includes(medico._id)) {
            paciente.medicosAsignados.push(medico._id);
            await paciente.save();
        }

        res.json({ message: 'Paciente asignado correctamente', paciente });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Desasignar paciente del médico
export const unassignPatient = async (req, res) => {
    try {
        const { pacienteId } = req.params;
        const medico = await Usuario.findById(req.usuario._id);
        
        if (!medico || medico.rol !== 'medico') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        const paciente = await Usuario.findById(pacienteId);

        // Remover del médico
        medico.pacientesAsignados = medico.pacientesAsignados.filter(
            id => id.toString() !== pacienteId
        );
        await medico.save();

        // Remover del paciente (relación inversa)
        if (paciente) {
            paciente.medicosAsignados = paciente.medicosAsignados.filter(
                id => id.toString() !== medico._id.toString()
            );
            await paciente.save();
        }

        res.json({ message: 'Paciente desasignado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Asignar cuidador a un paciente (médico asigna)
export const assignCaregiverToPatient = async (req, res) => {
    try {
        const { pacienteId, cuidadorId } = req.body;
        const medico = await Usuario.findById(req.usuario._id);
        
        if (!medico || medico.rol !== 'medico') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        if (!medico.pacientesAsignados.includes(pacienteId)) {
            return res.status(403).json({ error: 'No tienes acceso a este paciente' });
        }

        const paciente = await Usuario.findById(pacienteId);
        const cuidador = await Usuario.findById(cuidadorId);

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
};

// Actualizar información de un paciente
export const updatePatientInfo = async (req, res) => {
    try {
        const { pacienteId } = req.params;
        const { nombre, email } = req.body;
        const medico = await Usuario.findById(req.usuario._id);
        
        if (!medico || medico.rol !== 'medico') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        if (!medico.pacientesAsignados.includes(pacienteId)) {
            return res.status(403).json({ error: 'No tienes acceso a este paciente' });
        }

        const paciente = await Usuario.findByIdAndUpdate(
            pacienteId,
            { nombre, email },
            { new: true, runValidators: true }
        ).select('-password');

        if (!paciente) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }

        res.json(paciente);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Obtener todos los cuidadores disponibles
export const getAvailableCaregivers = async (req, res) => {
    try {
        const medico = await Usuario.findById(req.usuario._id);
        
        if (!medico || medico.rol !== 'medico') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        const cuidadores = await Usuario.find({ rol: 'cuidador/familiar' })
            .select('nombre email pacienteAsociado')
            .populate('pacienteAsociado', 'nombre');

        res.json(cuidadores);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener todos los pacientes (para asignar)
export const getAllPatients = async (req, res) => {
    try {
        const medico = await Usuario.findById(req.usuario._id);
        
        if (!medico || medico.rol !== 'medico') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        const pacientes = await Usuario.find({ rol: 'paciente' })
            .select('nombre email createdAt')
            .populate('cuidadores', 'nombre email');

        res.json(pacientes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener estadísticas generales del médico
export const getDoctorStats = async (req, res) => {
    try {
        const medico = await Usuario.findById(req.usuario._id)
            .populate('pacientesAsignados');
        
        if (!medico || medico.rol !== 'medico') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        const totalPacientes = medico.pacientesAsignados.length;
        
        // Contar fotos totales de todos los pacientes
        const totalFotos = await Foto.countDocuments({
            pacienteId: { $in: medico.pacientesAsignados }
        });

        // Contar grabaciones totales
        const totalGrabaciones = await Grabacion.countDocuments({
            pacienteId: { $in: medico.pacientesAsignados }
        });

        // Grabaciones de esta semana
        const inicioSemana = new Date();
        inicioSemana.setDate(inicioSemana.getDate() - 7);
        
        const grabacionesEstaSemana = await Grabacion.countDocuments({
            pacienteId: { $in: medico.pacientesAsignados },
            createdAt: { $gte: inicioSemana }
        });

        // Contar alertas no leídas
        const alertasNoLeidas = await AlertaCognitiva.countDocuments({
            pacienteId: { $in: medico.pacientesAsignados },
            leida: false
        });

        res.json({
            totalPacientes,
            totalFotos,
            totalGrabaciones,
            grabacionesEstaSemana,
            alertasNoLeidas
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ============= FUNCIONES PARA ANÁLISIS COGNITIVO (HU-03) =============

// Obtener línea base cognitiva de un paciente
export const getLineaBase = async (req, res) => {
    try {
        const { pacienteId } = req.params;
        const medico = await Usuario.findById(req.usuario._id);
        
        if (!medico || medico.rol !== 'medico') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        if (!medico.pacientesAsignados.includes(pacienteId)) {
            return res.status(403).json({ error: 'No tienes acceso a este paciente' });
        }

        const lineaBase = await AnalisisCognitivo.obtenerLineaBase(pacienteId);
        
        if (!lineaBase) {
            return res.status(404).json({ 
                error: 'No se ha establecido una línea base para este paciente',
                mensaje: 'Se necesitan al menos 3 análisis para establecer la línea base'
            });
        }

        res.json(lineaBase);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener historial de análisis cognitivos
export const getAnalisisCognitivo = async (req, res) => {
    try {
        const { pacienteId } = req.params;
        const { fechaInicio, fechaFin, limit = 50 } = req.query;
        
        const medico = await Usuario.findById(req.usuario._id);
        
        if (!medico || medico.rol !== 'medico') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        if (!medico.pacientesAsignados.includes(pacienteId)) {
            return res.status(403).json({ error: 'No tienes acceso a este paciente' });
        }

        const filtro = { pacienteId };
        
        if (fechaInicio || fechaFin) {
            filtro.fechaAnalisis = {};
            if (fechaInicio) filtro.fechaAnalisis.$gte = new Date(fechaInicio);
            if (fechaFin) filtro.fechaAnalisis.$lte = new Date(fechaFin);
        }

        const analisis = await AnalisisCognitivo.find(filtro)
            .populate('grabacionId', 'createdAt tipoContenido')
            .sort({ fechaAnalisis: -1 })
            .limit(parseInt(limit));

        // Calcular promedios del período
        const promedios = await AnalisisCognitivo.calcularPromedios(
            pacienteId,
            fechaInicio ? new Date(fechaInicio) : undefined,
            fechaFin ? new Date(fechaFin) : undefined
        );

        res.json({
            analisis,
            promedios,
            total: analisis.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener alertas cognitivas no leídas
export const getAlertas = async (req, res) => {
    try {
        const medico = await Usuario.findById(req.usuario._id);
        
        if (!medico || medico.rol !== 'medico') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        const alertas = await AlertaCognitiva.obtenerNoLeidas(medico.pacientesAsignados)
            .populate('pacienteId', 'nombre email')
            .populate('analisisId')
            .sort({ fechaAlerta: -1 });

        res.json(alertas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener historial de alertas con filtros
export const getHistorialAlertas = async (req, res) => {
    try {
        const { pacienteId, severidad, leida, fechaInicio, fechaFin } = req.query;
        const medico = await Usuario.findById(req.usuario._id);
        
        if (!medico || medico.rol !== 'medico') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        const filtros = {
            pacienteId: pacienteId ? pacienteId : { $in: medico.pacientesAsignados }
        };

        if (severidad) filtros.severidad = severidad;
        if (leida !== undefined) filtros.leida = leida === 'true';
        
        if (fechaInicio || fechaFin) {
            filtros.fechaAlerta = {};
            if (fechaInicio) filtros.fechaAlerta.$gte = new Date(fechaInicio);
            if (fechaFin) filtros.fechaAlerta.$lte = new Date(fechaFin);
        }

        const alertas = await AlertaCognitiva.obtenerHistorial(filtros)
            .populate('pacienteId', 'nombre email')
            .populate('analisisId')
            .sort({ fechaAlerta: -1 });

        res.json(alertas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Marcar alerta como leída
export const marcarAlertaLeida = async (req, res) => {
    try {
        const { alertaId } = req.params;
        const medico = await Usuario.findById(req.usuario._id);
        
        if (!medico || medico.rol !== 'medico') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        const alerta = await AlertaCognitiva.findById(alertaId);
        
        if (!alerta) {
            return res.status(404).json({ error: 'Alerta no encontrada' });
        }

        if (!medico.pacientesAsignados.includes(alerta.pacienteId.toString())) {
            return res.status(403).json({ error: 'No tienes acceso a esta alerta' });
        }

        await alerta.marcarLeida(req.usuario._id);

        res.json({ message: 'Alerta marcada como leída', alerta });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Registrar acción sobre una alerta
export const registrarAccionAlerta = async (req, res) => {
    try {
        const { alertaId } = req.params;
        const { tipo, descripcion } = req.body;
        
        const medico = await Usuario.findById(req.usuario._id);
        
        if (!medico || medico.rol !== 'medico') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        const alerta = await AlertaCognitiva.findById(alertaId);
        
        if (!alerta) {
            return res.status(404).json({ error: 'Alerta no encontrada' });
        }

        if (!medico.pacientesAsignados.includes(alerta.pacienteId.toString())) {
            return res.status(403).json({ error: 'No tienes acceso a esta alerta' });
        }

        await alerta.registrarAccion(req.usuario._id, tipo, descripcion);

        res.json({ message: 'Acción registrada correctamente', alerta });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Actualizar umbrales de configuración
export const actualizarUmbrales = async (req, res) => {
    try {
        const { umbralDesviacion = 0.15, severidades } = req.body;
        const medico = await Usuario.findById(req.usuario._id);
        
        if (!medico || medico.rol !== 'medico') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        // Buscar o crear configuración del médico
        let config = await Configuracion.findOne({ usuarioId: medico._id });
        
        if (!config) {
            config = new Configuracion({
                usuarioId: medico._id,
                umbralDesviacion,
                severidades: severidades || {
                    baja: { min: 0.15, max: 0.25 },
                    media: { min: 0.25, max: 0.35 },
                    alta: { min: 0.35, max: 0.50 },
                    critica: { min: 0.50, max: 1.0 }
                }
            });
        } else {
            config.umbralDesviacion = umbralDesviacion;
            if (severidades) config.severidades = severidades;
        }

        await config.save();

        res.json({ message: 'Umbrales actualizados correctamente', config });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Generar reporte completo de un paciente (HU-03: <5 minutos)
export const generarReporte = async (req, res) => {
    try {
        const { pacienteId } = req.params;
        const { fechaInicio, fechaFin, encriptar = false } = req.query;
        
        const medico = await Usuario.findById(req.usuario._id);
        
        if (!medico || medico.rol !== 'medico') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        if (!medico.pacientesAsignados.includes(pacienteId)) {
            return res.status(403).json({ error: 'No tienes acceso a este paciente' });
        }

        const startTime = Date.now();

        // Obtener datos del paciente
        const paciente = await Usuario.findById(pacienteId).select('-password');
        
        // Obtener línea base
        const lineaBase = await AnalisisCognitivo.obtenerLineaBase(pacienteId);
        
        // Obtener análisis del período
        const filtro = { pacienteId };
        if (fechaInicio || fechaFin) {
            filtro.fechaAnalisis = {};
            if (fechaInicio) filtro.fechaAnalisis.$gte = new Date(fechaInicio);
            if (fechaFin) filtro.fechaAnalisis.$lte = new Date(fechaFin);
        }
        
        const analisis = await AnalisisCognitivo.find(filtro).sort({ fechaAnalisis: -1 });
        
        // Obtener alertas del período
        const alertasFiltro = { pacienteId };
        if (fechaInicio || fechaFin) {
            alertasFiltro.fechaAlerta = {};
            if (fechaInicio) alertasFiltro.fechaAlerta.$gte = new Date(fechaInicio);
            if (fechaFin) alertasFiltro.fechaAlerta.$lte = new Date(fechaFin);
        }
        
        const alertas = await AlertaCognitiva.find(alertasFiltro).sort({ fechaAlerta: -1 });

        // Calcular promedios
        const promedios = await AnalisisCognitivo.calcularPromedios(
            pacienteId,
            fechaInicio ? new Date(fechaInicio) : undefined,
            fechaFin ? new Date(fechaFin) : undefined
        );

        // Generar PDF
        const pdfBuffer = await generarReportePDF(
            {
                nombre: paciente.nombre,
                email: paciente.email
            },
            lineaBase,
            promedios,
            analisis,
            encriptar === 'true'
        );

        // Configurar headers para descarga
        const filename = encriptar === 'true' 
            ? `reporte-${paciente.nombre.replace(/\s+/g, '-')}-${Date.now()}.encrypted`
            : `reporte-${paciente.nombre.replace(/\s+/g, '-')}-${Date.now()}.pdf`;

        res.setHeader('Content-Type', encriptar === 'true' ? 'application/octet-stream' : 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error al generar reporte:', error);
        res.status(500).json({ error: error.message });
    }
};
