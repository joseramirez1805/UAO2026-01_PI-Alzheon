import mongoose from 'mongoose';

const pruebaSchema = new mongoose.Schema({
    pacienteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true,
        index: true
    },
    
    // Primera secuencia de imágenes (2-3 imágenes)
    primeraSecuenciaImagenes: [{
        url: { type: String, required: true },
        orden: { type: Number, required: true }
    }],
    
    // Segunda secuencia de imágenes (2-3 imágenes)
    segundaSecuenciaImagenes: [{
        url: { type: String, required: true },
        orden: { type: Number, required: true }
    }],
    
    // Pregunta formulada
    pregunta: {
        type: String,
        required: true,
        default: '¿Qué hiciste el día de ayer?'
    },
    
    // Respuesta del paciente
    respuestaPaciente: {
        type: String,
        default: null
    },
    
    // Orden correcto de las imágenes (combinadas)
    ordenCorrecto: [{
        type: Number, // índices del array combinado
        required: true
    }],
    
    // Orden proporcionado por el paciente
    ordenPaciente: [{
        type: Number,
        default: null
    }],
    
    // Métricas de evaluación
    puntajeOrdenamiento: {
        type: Number, // % de acierto en ordenamiento
        min: 0,
        max: 100,
        default: null
    },
    
    tiempoCompletado: {
        type: Number, // segundos
        default: null
    },
    
    estado: {
        type: String,
        enum: ['en_progreso', 'completada', 'abandonada'],
        default: 'en_progreso'
    },
    
    // Timestamps de cada fase
    timestamps: {
        inicioTest: { type: Date, default: Date.now },
        finPrimeraSecuencia: { type: Date, default: null },
        finRespuestaVerbal: { type: Date, default: null },
        finSegundaSecuencia: { type: Date, default: null },
        finOrdenamiento: { type: Date, default: null }
    },
    
    // Análisis adicional
    analisisCoherenciaRespuesta: {
        type: Number, // 0.0 - 1.0
        min: 0,
        max: 1,
        default: null
    },
    
    observaciones: {
        type: String,
        default: null
    }
    
}, { timestamps: true });

// Índices para mejorar las consultas
pruebaSchema.index({ pacienteId: 1, createdAt: -1 });
pruebaSchema.index({ estado: 1 });

// Método para calcular el puntaje de ordenamiento
pruebaSchema.methods.calcularPuntajeOrdenamiento = function() {
    if (!this.ordenPaciente || this.ordenPaciente.length === 0) {
        return 0;
    }
    
    let aciertos = 0;
    const totalImagenes = this.ordenCorrecto.length;
    
    for (let i = 0; i < totalImagenes; i++) {
        if (this.ordenCorrecto[i] === this.ordenPaciente[i]) {
            aciertos++;
        }
    }
    
    return Math.round((aciertos / totalImagenes) * 100);
};

// Método para obtener todas las imágenes en orden combinado
pruebaSchema.methods.obtenerImagenesCombinadas = function() {
    return [
        ...this.primeraSecuenciaImagenes.map(img => ({ ...img.toObject(), secuencia: 1 })),
        ...this.segundaSecuenciaImagenes.map(img => ({ ...img.toObject(), secuencia: 2 }))
    ].sort((a, b) => a.orden - b.orden);
};

const PruebaCognitiva = mongoose.model('PruebaCognitiva', pruebaSchema);

export default PruebaCognitiva;
