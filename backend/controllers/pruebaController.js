import PruebaCognitiva from '../models/pruebaCognitiva.js';
import Foto from '../models/foto.js';

// Obtener imágenes reales aleatorias de fuentes confiables con alta variedad
const obtenerImagenesAleatorias = async (cantidad) => {
    const imagenes = [];
    
    // URLs de imágenes variadas: paisajes, personas, comida, objetos, animales, arquitectura
    const imagenesReales = [
        // Paisajes
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
        // Personas
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop',
        // Comida
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop',
        // Animales
        'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&h=600&fit=crop',
        // Arquitectura/Ciudades
        'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop',
        // Objetos
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800&h=600&fit=crop',
        // Flores/Plantas
        'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=600&fit=crop',
        // Playa/Agua
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&h=600&fit=crop',
        // Arte/Abstracto
        'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&h=600&fit=crop',
        // Vehículos
        'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=800&h=600&fit=crop'
    ];
    
    // Mezclar el array para obtener orden aleatorio
    const imagenesBarajadas = [...imagenesReales].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < cantidad && i < imagenesBarajadas.length; i++) {
        imagenes.push({
            url: imagenesBarajadas[i],
            orden: i
        });
    }
    
    return imagenes;
};

// Iniciar una nueva prueba cognitiva
export const iniciarPrueba = async (req, res) => {
    try {
        const pacienteId = req.usuario._id;
        
        // Marcar cualquier prueba anterior en progreso como abandonada
        await PruebaCognitiva.updateMany(
            {
                pacienteId,
                estado: 'en_progreso'
            },
            {
                $set: { estado: 'abandonada' }
            }
        );
        
        console.log(`✅ Iniciando NUEVA prueba para paciente ${pacienteId}`);
        
        // Generar exactamente 5 imágenes en total (2+3 o 3+2) sin repeticiones
        const cantidadPrimeraSecuencia = Math.random() > 0.5 ? 3 : 2;
        const cantidadSegundaSecuencia = 5 - cantidadPrimeraSecuencia; // Siempre suma 5
        
        // Primero, intentar usar las fotos subidas para este paciente
        const fotosPacienteDocs = await Foto.find({ pacienteId }).sort({ createdAt: -1 });
        console.log(`📸 Fotos encontradas en BD para paciente ${pacienteId}: ${fotosPacienteDocs.length}`);
        fotosPacienteDocs.forEach((f, i) => {
            const tieneUrl = !!f.url_contenido;
            const tieneImagen = !!(f.imagen && f.imagen.data);
            console.log(`   Foto ${i}: etiqueta="${f.etiqueta}", url_contenido=${tieneUrl}, imagen.data=${tieneImagen}`);
        });

        const fotosPaciente = fotosPacienteDocs.map(f => {
            let url = null;
            if (f.url_contenido) url = f.url_contenido;
            else if (f.imagen && f.imagen.data) {
                const b64 = f.imagen.data.toString('base64');
                url = `data:${f.imagen.contentType};base64,${b64}`;
            }
            return url ? { url, orden: 0 } : null;
        }).filter(Boolean);
        console.log(`   ✓ Fotos con URLs válidas: ${fotosPaciente.length}`);

        // Seleccionar hasta 5 imágenes del paciente (aleatorio)
        let todasLasImagenes = [];
        if (fotosPaciente.length > 0) {
            const shuffledPaciente = [...fotosPaciente].sort(() => Math.random() - 0.5);
            todasLasImagenes = shuffledPaciente.slice(0, 5);
        }

        // Si hay menos de 5, completar con imágenes externas
        if (todasLasImagenes.length < 5) {
            const faltantes = 5 - todasLasImagenes.length;
            const externas = await obtenerImagenesAleatorias(faltantes + 5);
            for (const ext of externas) {
                if (todasLasImagenes.length >= 5) break;
                const existe = todasLasImagenes.some(i => i.url === ext.url);
                if (!existe) todasLasImagenes.push({ url: ext.url, orden: 0 });
            }
        }
        
        // Dividir en dos secuencias sin repeticiones
        const primeraSecuencia = todasLasImagenes.slice(0, cantidadPrimeraSecuencia).map((img, idx) => ({
            url: img.url,
            orden: idx
        }));
        
        const segundaSecuencia = todasLasImagenes.slice(cantidadPrimeraSecuencia).map((img, idx) => ({
            url: img.url,
            orden: idx
        }));
        
        // Crear orden correcto (concatenar ambas secuencias)
        const ordenCorrecto = [
            ...primeraSecuencia.map((_, idx) => idx),
            ...segundaSecuencia.map((_, idx) => idx + primeraSecuencia.length)
        ];
        
        // Preguntas posibles
        const preguntas = [
            '¿Qué hiciste el día de ayer?',
            '¿Qué desayunaste hoy?',
            '¿Cuál es tu recuerdo favorito de la semana pasada?',
            '¿Con quién hablaste ayer?',
            '¿Qué actividad disfrutaste más esta semana?'
        ];
        
        const preguntaAleatoria = preguntas[Math.floor(Math.random() * preguntas.length)];
        
        // Crear la prueba
        const nuevaPrueba = new PruebaCognitiva({
            pacienteId,
            primeraSecuenciaImagenes: primeraSecuencia,
            segundaSecuenciaImagenes: segundaSecuencia,
            ordenCorrecto,
            pregunta: preguntaAleatoria,
            timestamps: {
                inicioTest: new Date()
            }
        });
        
        await nuevaPrueba.save();

        // Log de depuración: URLs seleccionadas
        try {
            const fotosPacienteUsadas = todasLasImagenes.filter(i => i.url.startsWith('data:')).length;
            const fotosExternasUsadas = todasLasImagenes.filter(i => !i.url.startsWith('data:')).length;
            console.log(`🎯 NUEVA PRUEBA CREADA: ${nuevaPrueba._id} para paciente ${pacienteId}`);
            console.log(`   - Imágenes del paciente usadas: ${fotosPacienteUsadas}`);
            console.log(`   - Imágenes externas usadas: ${fotosExternasUsadas}`);
            console.log(`   - Total: ${todasLasImagenes.length}`);
        } catch (e) {
            console.warn('No se pudieron loggear las URLs de la prueba', e);
        }

        // Enviar prueba y devolver lista de imágenes usadas para facilitar depuración en frontend
        res.status(201).json({
            mensaje: 'Prueba iniciada exitosamente',
            prueba: nuevaPrueba,
            fase: 'primera_secuencia',
            debugImagenes: todasLasImagenes.map(i => i.url)
        });
        
    } catch (error) {
        console.error('Error al iniciar prueba:', error);
        res.status(500).json({ error: error.message });
    }
};

// Registrar que el paciente vio la primera secuencia
export const registrarPrimeraSecuencia = async (req, res) => {
    try {
        const { pruebaId } = req.params;
        const pacienteId = req.usuario._id;
        
        const prueba = await PruebaCognitiva.findOne({
            _id: pruebaId,
            pacienteId,
            estado: 'en_progreso'
        });
        
        if (!prueba) {
            return res.status(404).json({ error: 'Prueba no encontrada' });
        }
        
        prueba.timestamps.finPrimeraSecuencia = new Date();
        await prueba.save();
        
        res.json({
            mensaje: 'Primera secuencia completada',
            prueba,
            fase: 'respuesta_verbal'
        });
        
    } catch (error) {
        console.error('Error al registrar primera secuencia:', error);
        res.status(500).json({ error: error.message });
    }
};

// Guardar respuesta verbal del paciente
export const guardarRespuestaVerbal = async (req, res) => {
    try {
        console.log(`📝 guardarRespuestaVerbal: Iniciando...`);
        console.log(`   - pruebaId: ${req.params.pruebaId}`);
        console.log(`   - Usuario: ${req.usuario?.nombre || 'N/A'} (${req.usuario?._id || 'N/A'})`);
        console.log(`   - Body: ${JSON.stringify(req.body)}`);
        
        const { pruebaId } = req.params;
        const pacienteId = req.usuario._id;
        const { respuestaTexto } = req.body;
        
        const prueba = await PruebaCognitiva.findOne({
            _id: pruebaId,
            pacienteId,
            estado: 'en_progreso'
        });
        
        if (!prueba) {
            return res.status(404).json({ error: 'Prueba no encontrada' });
        }
        
        if (!respuestaTexto?.trim()) {
            return res.status(400).json({ 
                error: 'Debes proporcionar una respuesta en texto' 
            });
        }
        
        // Actualizar prueba
        prueba.respuestaPaciente = respuestaTexto;
        prueba.timestamps.finRespuestaVerbal = new Date();
        
        await prueba.save();
        
        res.json({
            mensaje: 'Respuesta guardada exitosamente',
            prueba,
            fase: 'segunda_secuencia'
        });
        
    } catch (error) {
        console.error('Error al guardar respuesta verbal:', error);
        res.status(500).json({ error: error.message });
    }
};

// Registrar que el paciente vio la segunda secuencia
export const registrarSegundaSecuencia = async (req, res) => {
    try {
        const { pruebaId } = req.params;
        const pacienteId = req.usuario._id;
        
        const prueba = await PruebaCognitiva.findOne({
            _id: pruebaId,
            pacienteId,
            estado: 'en_progreso'
        });
        
        if (!prueba) {
            return res.status(404).json({ error: 'Prueba no encontrada' });
        }
        
        prueba.timestamps.finSegundaSecuencia = new Date();
        await prueba.save();
        
        res.json({
            mensaje: 'Segunda secuencia completada',
            prueba,
            fase: 'ordenamiento'
        });
        
    } catch (error) {
        console.error('Error al registrar segunda secuencia:', error);
        res.status(500).json({ error: error.message });
    }
};

// Guardar el ordenamiento del paciente y finalizar prueba
export const finalizarPrueba = async (req, res) => {
    try {
        const { pruebaId } = req.params;
        const pacienteId = req.usuario._id;
        const { ordenPaciente } = req.body; // Array de índices
        
        if (!Array.isArray(ordenPaciente)) {
            return res.status(400).json({ 
                error: 'El orden del paciente debe ser un array' 
            });
        }
        
        const prueba = await PruebaCognitiva.findOne({
            _id: pruebaId,
            pacienteId,
            estado: 'en_progreso'
        });
        
        if (!prueba) {
            return res.status(404).json({ error: 'Prueba no encontrada' });
        }
        
        // Guardar orden del paciente
        prueba.ordenPaciente = ordenPaciente;
        
        // Calcular puntaje
        const puntaje = prueba.calcularPuntajeOrdenamiento();
        prueba.puntajeOrdenamiento = puntaje;
        
        // Calcular tiempo total
        prueba.timestamps.finOrdenamiento = new Date();
        const tiempoTotal = Math.floor(
            (prueba.timestamps.finOrdenamiento - prueba.timestamps.inicioTest) / 1000
        );
        prueba.tiempoCompletado = tiempoTotal;
        
        // Marcar como completada
        prueba.estado = 'completada';
        
        await prueba.save();
        
        console.log(`✅ PRUEBA COMPLETADA: ${pruebaId} | Puntaje: ${puntaje}%`);
        
        res.json({
            mensaje: 'Prueba completada exitosamente',
            prueba,
            resultados: {
                puntajeOrdenamiento: puntaje,
                tiempoCompletado: tiempoTotal
            }
        });
        
    } catch (error) {
        console.error('Error al finalizar prueba:', error);
        res.status(500).json({ error: error.message });
    }
};

// Obtener historial de pruebas del paciente
export const obtenerHistorialPruebas = async (req, res) => {
    try {
        const pacienteId = req.usuario._id;
        
        const pruebas = await PruebaCognitiva.find({ pacienteId })
            .sort({ createdAt: -1 })
            .limit(20);
        
        res.json(pruebas);
        
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ error: error.message });
    }
};

// Obtener una prueba específica
export const obtenerPrueba = async (req, res) => {
    try {
        const { pruebaId } = req.params;
        const pacienteId = req.usuario._id;
        
        const prueba = await PruebaCognitiva.findOne({
            _id: pruebaId,
            pacienteId
        });
        
        if (!prueba) {
            return res.status(404).json({ error: 'Prueba no encontrada' });
        }
        
        res.json(prueba);
        
    } catch (error) {
        console.error('Error al obtener prueba:', error);
        res.status(500).json({ error: error.message });
    }
};

// Abandonar prueba en progreso
export const abandonarPrueba = async (req, res) => {
    try {
        const { pruebaId } = req.params;
        const pacienteId = req.usuario._id;
        
        const prueba = await PruebaCognitiva.findOne({
            _id: pruebaId,
            pacienteId,
            estado: 'en_progreso'
        });
        
        if (!prueba) {
            return res.status(404).json({ error: 'Prueba no encontrada' });
        }
        
        prueba.estado = 'abandonada';
        await prueba.save();
        
        res.json({
            mensaje: 'Prueba abandonada',
            prueba
        });
        
    } catch (error) {
        console.error('Error al abandonar prueba:', error);
        res.status(500).json({ error: error.message });
    }
};

// Obtener estadísticas de pruebas del paciente
export const obtenerEstadisticasPruebas = async (req, res) => {
    try {
        const pacienteId = req.usuario._id;
        
        const pruebas = await PruebaCognitiva.find({ 
            pacienteId,
            estado: 'completada'
        });
        
        if (pruebas.length === 0) {
            return res.json({
                totalPruebas: 0,
                promedioOrdenamiento: 0,
                promedioTiempo: 0,
                mejorPuntaje: 0,
                ultimaPrueba: null
            });
        }
        
        const totalPruebas = pruebas.length;
        const promedioOrdenamiento = pruebas.reduce((acc, p) => acc + p.puntajeOrdenamiento, 0) / totalPruebas;
        const promedioTiempo = pruebas.reduce((acc, p) => acc + (p.tiempoCompletado || 0), 0) / totalPruebas;
        const mejorPuntaje = Math.max(...pruebas.map(p => p.puntajeOrdenamiento));
        
        res.json({
            totalPruebas,
            promedioOrdenamiento: Math.round(promedioOrdenamiento),
            promedioTiempo: Math.round(promedioTiempo),
            mejorPuntaje,
            ultimaPrueba: pruebas[0]
        });
        
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: error.message });
    }
};
