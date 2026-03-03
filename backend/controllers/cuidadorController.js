import Usuario from '../models/usuario.js';
import Foto from '../models/foto.js';
import Grabacion from '../models/grabacion.js';
import AnalisisCognitivo from '../models/analisisCognitivo.js';
import PruebaCognitiva from '../models/pruebaCognitiva.js';
import { compressImage } from '../services/uploadService.js'; // sólo necesitamos compresión si guardamos en BD

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

        let fotos = await Foto.find({ pacienteId: cuidador.pacienteAsociado })
            .populate('cuidadorId', 'nombre')
            .sort({ createdAt: -1 });

        // convertir imágenes guardadas en datos base64 para el frontend
        fotos = fotos.map(f => {
            const obj = f.toObject();
            if (obj.imagen && obj.imagen.data) {
                const b64 = obj.imagen.data.toString('base64');
                obj.url_contenido = `data:${obj.imagen.contentType};base64,${b64}`;
                delete obj.imagen; // ya no es necesario en la respuesta
            }
            return obj;
        });

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
        let imagen;

        // Si se sube un archivo de imagen, guardamos el buffer en Mongo (comprimido opcionalmente)
        if (req.file) {
            const compressed = await compressImage(req.file.buffer);
            imagen = {
                data: compressed,
                contentType: req.file.mimetype
            };
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
            imagen,
            descripcion,
            pacienteId: cuidador.pacienteAsociado,
            cuidadorId: req.usuario._id
        });

        await nuevaFoto.save();
        
        let fotoPopulada = await Foto.findById(nuevaFoto._id)
            .populate('cuidadorId', 'nombre');

        // formatear respuesta igual que en listado
        fotoPopulada = fotoPopulada.toObject();
        if (fotoPopulada.imagen && fotoPopulada.imagen.data) {
            const b64 = fotoPopulada.imagen.data.toString('base64');
            fotoPopulada.url_contenido = `data:${fotoPopulada.imagen.contentType};base64,${b64}`;
            delete fotoPopulada.imagen;
        }

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
        const { etiqueta, descripcion, url_contenido: newUrl } = req.body;
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

        // si sube un nuevo archivo, reemplazamos el binario
        if (req.file) {
            const compressed = await compressImage(req.file.buffer);
            foto.imagen = {
                data: compressed,
                contentType: req.file.mimetype
            };
            foto.url_contenido = undefined;
        }

        // si se envía una nueva URL
        if (newUrl) {
            foto.url_contenido = newUrl;
            foto.imagen = undefined;
        }
        
        await foto.save();
        
        let fotoActualizada = await Foto.findById(foto._id)
            .populate('cuidadorId', 'nombre');

        fotoActualizada = fotoActualizada.toObject();
        if (fotoActualizada.imagen && fotoActualizada.imagen.data) {
            const b64 = fotoActualizada.imagen.data.toString('base64');
            fotoActualizada.url_contenido = `data:${fotoActualizada.imagen.contentType};base64,${b64}`;
            delete fotoActualizada.imagen;
        }

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
        const grabacionesFormateadas = grabaciones.map(grabacion => {
            let fotoUrl = grabacion.photoId?.url_contenido || '';
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
                audioUrl: grabacion.audioUrl, // Ya es URL completa de R2
                nota: grabacion.photoId?.etiqueta || '',
                descripcionTexto: grabacion.descripcionTexto, // Texto escrito por el paciente
                transcripcion: grabacion.transcripcion, // Transcripción automática
                tipoContenido: grabacion.tipoContenido // 'audio', 'texto', 'ambos'
            };
        });

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
                fotoUrl: (() => {
                    let u = grabacion.photoId?.url_contenido || '';
                    if ((!u || u === '') && grabacion.photoId?.imagen?.data) {
                        const b64 = grabacion.photoId.imagen.data.toString('base64');
                        u = `data:${grabacion.photoId.imagen.contentType};base64,${b64}`;
                    }
                    return u;
                })(),
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
