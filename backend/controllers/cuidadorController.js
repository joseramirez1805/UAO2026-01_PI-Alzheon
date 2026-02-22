import Usuario from '../models/usuario.js';
import Foto from '../models/foto.js';
import Grabacion from '../models/grabacion.js';
import AnalisisCognitivo from '../models/analisisCognitivo.js';
import PruebaCognitiva from '../models/pruebaCognitiva.js';
import { uploadImageToR2 } from '../services/uploadService.js';

//Estudiado
// Obtener paciente asociado al cuidador
export const getAssociatedPatient = async (req, res) => {
    try {
        const cuidador = await Usuario.findById(req.usuario._id)
            .populate('pacienteAsociado', 'nombre email');
        
        if (!cuidador || cuidador.rol !== 'cuidador/familiar') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        if (!cuidador.pacienteAsociado) {
            return res.status(404).json({ error: 'No tienes un paciente asociado' });
        }

        res.json(cuidador.pacienteAsociado);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener fotos del paciente asociado
export const getPatientPhotos = async (req, res) => {
    try {
        const cuidador = await Usuario.findById(req.usuario._id);
        
        if (!cuidador || cuidador.rol !== 'cuidador/familiar') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        if (!cuidador.pacienteAsociado) {
            return res.status(404).json({ error: 'No tienes un paciente asociado' });
        }

        const fotos = await Foto.find({ pacienteId: cuidador.pacienteAsociado })
            .populate('cuidadorId', 'nombre')
            .sort({ createdAt: -1 });

        res.json(fotos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Crear nueva foto para el paciente
export const createPatientPhoto = async (req, res) => {
    try {
        const cuidador = await Usuario.findById(req.usuario._id);
        
        if (!cuidador || cuidador.rol !== 'cuidador/familiar') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        if (!cuidador.pacienteAsociado) {
            return res.status(404).json({ error: 'No tienes un paciente asociado' });
        }

        let url_contenido;

        // Si se sube un archivo de imagen
        if (req.file) {
            // Subir imagen comprimida a R2
            url_contenido = await uploadImageToR2(req.file.buffer, req.file.originalname);
        } 
        // Si se envía una URL externa
        else if (req.body.url_contenido) {
            url_contenido = req.body.url_contenido;
        } 
        else {
            return res.status(400).json({ error: 'Debe proporcionar una imagen o una URL' });
        }

        const { etiqueta, descripcion } = req.body;

        const nuevaFoto = new Foto({
            etiqueta,
            url_contenido,
            descripcion,
            pacienteId: cuidador.pacienteAsociado,
            cuidadorId: req.usuario._id
        });

        await nuevaFoto.save();
        
        const fotoPopulada = await Foto.findById(nuevaFoto._id)
            .populate('cuidadorId', 'nombre');

        res.status(201).json(fotoPopulada);
    } catch (error) {
        console.error('Error al crear foto:', error);
        res.status(400).json({ error: error.message });
    }
};

// Actualizar foto
export const updatePatientPhoto = async (req, res) => {
    try {
        const { photoId } = req.params;
        const { etiqueta, descripcion } = req.body;
        const cuidador = await Usuario.findById(req.usuario._id);
        
        if (!cuidador || cuidador.rol !== 'cuidador/familiar') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        const foto = await Foto.findById(photoId);
        
        if (!foto) {
            return res.status(404).json({ error: 'Foto no encontrada' });
        }

        // Verificar que el cuidador es el que subió la foto o está asociado al paciente
        if (foto.cuidadorId.toString() !== req.usuario._id.toString() && 
            foto.pacienteId.toString() !== cuidador.pacienteAsociado?.toString()) {
            return res.status(403).json({ error: 'No tienes permiso para editar esta foto' });
        }

        foto.etiqueta = etiqueta || foto.etiqueta;
        foto.descripcion = descripcion !== undefined ? descripcion : foto.descripcion;
        
        await foto.save();
        
        const fotoActualizada = await Foto.findById(foto._id)
            .populate('cuidadorId', 'nombre');

        res.json(fotoActualizada);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Eliminar foto
export const deletePatientPhoto = async (req, res) => {
    try {
        const { photoId } = req.params;
        const cuidador = await Usuario.findById(req.usuario._id);
        
        if (!cuidador || cuidador.rol !== 'cuidador/familiar') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        const foto = await Foto.findById(photoId);
        
        if (!foto) {
            return res.status(404).json({ error: 'Foto no encontrada' });
        }

        // Verificar que el cuidador es el que subió la foto o está asociado al paciente
        if (foto.cuidadorId.toString() !== req.usuario._id.toString() && 
            foto.pacienteId.toString() !== cuidador.pacienteAsociado?.toString()) {
            return res.status(403).json({ error: 'No tienes permiso para eliminar esta foto' });
        }

        // Eliminar también las grabaciones asociadas a esta foto
        await Grabacion.deleteMany({ photoId: photoId });
        
        await Foto.findByIdAndDelete(photoId);

        res.json({ message: 'Foto eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener grabaciones del paciente
export const getPatientRecordings = async (req, res) => {
    try {
        const cuidador = await Usuario.findById(req.usuario._id);
        
        if (!cuidador || cuidador.rol !== 'cuidador/familiar') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        if (!cuidador.pacienteAsociado) {
            return res.status(404).json({ error: 'No tienes un paciente asociado' });
        }

        const grabaciones = await Grabacion.find({ pacienteId: cuidador.pacienteAsociado })
            .populate('photoId', 'etiqueta url_contenido')
            .sort({ createdAt: -1 });

        // Mapear para incluir todos los campos necesarios
        const grabacionesFormateadas = grabaciones.map(grabacion => ({
            _id: grabacion._id,
            photoId: grabacion.photoId?._id,
            fotoUrl: grabacion.photoId?.url_contenido || '',
            fecha: grabacion.createdAt,
            duracion: grabacion.duracion,
            audioUrl: grabacion.audioUrl, // Ya es URL completa de R2
            nota: grabacion.photoId?.etiqueta || '',
            descripcionTexto: grabacion.descripcionTexto, // Texto escrito por el paciente
            transcripcion: grabacion.transcripcion, // Transcripción automática
            tipoContenido: grabacion.tipoContenido // 'audio', 'texto', 'ambos'
        }));

        res.json(grabacionesFormateadas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener grabaciones con análisis cognitivo (para línea de tiempo)
export const getRecordingsWithAnalysis = async (req, res) => {
    try {
        const cuidador = await Usuario.findById(req.usuario._id);
        
        if (!cuidador || cuidador.rol !== 'cuidador/familiar') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        if (!cuidador.pacienteAsociado) {
            return res.status(404).json({ error: 'No tienes un paciente asociado' });
        }

        // Obtener grabaciones del paciente
        const grabaciones = await Grabacion.find({ pacienteId: cuidador.pacienteAsociado })
            .populate('photoId', 'etiqueta url_contenido')
            .sort({ createdAt: -1 });

        // Obtener todos los análisis cognitivos de las grabaciones
        const grabacionIds = grabaciones.map(g => g._id);
        const analisis = await AnalisisCognitivo.find({ grabacionId: { $in: grabacionIds } });
        
        // Crear un mapa de análisis por grabacionId para búsqueda rápida
        const analisisMap = new Map();
        analisis.forEach(a => {
            analisisMap.set(a.grabacionId.toString(), a);
        });

        // Mapear para incluir análisis cognitivo
        const grabacionesFormateadas = grabaciones.map(grabacion => {
            const analisisCognitivo = analisisMap.get(grabacion._id.toString());
            
            return {
                _id: grabacion._id,
                photoId: grabacion.photoId?._id,
                fotoUrl: grabacion.photoId?.url_contenido || '',
                fecha: grabacion.createdAt,
                duracion: grabacion.duracion,
                audioUrl: grabacion.audioUrl,
                nota: grabacion.photoId?.etiqueta || '',
                descripcionTexto: grabacion.descripcionTexto,
                transcripcion: grabacion.transcripcion,
                tipoContenido: grabacion.tipoContenido,
                analisisCognitivo: analisisCognitivo ? {
                    _id: analisisCognitivo._id,
                    coherencia: analisisCognitivo.coherencia,
                    claridad: analisisCognitivo.claridad,
                    riquezaLexica: analisisCognitivo.riquezaLexica,
                    memoria: analisisCognitivo.memoria,
                    emocion: analisisCognitivo.emocion,
                    orientacion: analisisCognitivo.orientacion,
                    razonamiento: analisisCognitivo.razonamiento,
                    atencion: analisisCognitivo.atencion,
                    puntuacionGlobal: analisisCognitivo.puntuacionGlobal,
                    observaciones: analisisCognitivo.observaciones,
                    alertas: analisisCognitivo.alertas,
                    createdAt: analisisCognitivo.createdAt
                } : undefined
            };
        });

        res.json(grabacionesFormateadas);
    } catch (error) {
        console.error('Error en getRecordingsWithAnalysis:', error);
        res.status(500).json({ error: error.message });
    }
};

// Obtener estadísticas del paciente
export const getPatientStats = async (req, res) => {
    try {
        const cuidador = await Usuario.findById(req.usuario._id);
        
        if (!cuidador || cuidador.rol !== 'cuidador/familiar') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        if (!cuidador.pacienteAsociado) {
            return res.status(404).json({ error: 'No tienes un paciente asociado' });
        }

        const totalFotos = await Foto.countDocuments({ pacienteId: cuidador.pacienteAsociado });
        const totalGrabaciones = await Grabacion.countDocuments({ pacienteId: cuidador.pacienteAsociado });
        
        // Grabaciones esta semana
        const now = new Date();
        const firstDay = new Date(now);
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        firstDay.setDate(diff);
        firstDay.setHours(0, 0, 0, 0);
        
        const grabacionesEstaSemana = await Grabacion.countDocuments({
            pacienteId: cuidador.pacienteAsociado,
            createdAt: { $gte: firstDay }
        });

        // Última grabación
        const ultimaGrabacion = await Grabacion.findOne({ 
            pacienteId: cuidador.pacienteAsociado 
        }).sort({ createdAt: -1 });

        res.json({
            totalFotos,
            totalGrabaciones,
            grabacionesEstaSemana,
            ultimaGrabacion: ultimaGrabacion ? {
                fecha: ultimaGrabacion.createdAt,
                duracion: ultimaGrabacion.duracion
            } : null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener pruebas cognitivas del paciente asociado
export const getPatientCognitivePruebas = async (req, res) => {
    try {
        const cuidador = await Usuario.findById(req.usuario._id);
        
        if (!cuidador || cuidador.rol !== 'cuidador/familiar') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        if (!cuidador.pacienteAsociado) {
            return res.status(404).json({ error: 'No tienes un paciente asociado' });
        }

        const pruebas = await PruebaCognitiva.find({ 
            pacienteId: cuidador.pacienteAsociado 
        }).sort({ createdAt: -1 });

        res.json(pruebas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Eliminar una prueba cognitiva del paciente
export const deletePatientCognitivePrueba = async (req, res) => {
    try {
        const cuidador = await Usuario.findById(req.usuario._id);
        
        if (!cuidador || cuidador.rol !== 'cuidador/familiar') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        if (!cuidador.pacienteAsociado) {
            return res.status(404).json({ error: 'No tienes un paciente asociado' });
        }

        const { pruebaId } = req.params;
        
        // Verificar que la prueba pertenece al paciente del cuidador
        const prueba = await PruebaCognitiva.findOne({
            _id: pruebaId,
            pacienteId: cuidador.pacienteAsociado
        });

        if (!prueba) {
            return res.status(404).json({ error: 'Prueba no encontrada' });
        }

        await PruebaCognitiva.findByIdAndDelete(pruebaId);
        
        res.json({ mensaje: 'Prueba eliminada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
