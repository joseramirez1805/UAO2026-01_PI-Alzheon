import mongoose from 'mongoose';

const fotoSchema = new mongoose.Schema({
    etiqueta: {
        type: String,
        required: true
    },
    // la URL sigue existiendo para fotos externas o cuando se quiera seguir usando R2
    url_contenido: {
        type: String
    },
    // nuevo campo binario para almacenar la imagen directamente en Mongo
    imagen: {
        data: Buffer,
        contentType: String
    },
    descripcion: {
        type: String
    },
    pacienteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    cuidadorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    }
}, {
    timestamps: true
});

// Índices para mejorar búsquedas
fotoSchema.index({ pacienteId: 1 });
fotoSchema.index({ cuidadorId: 1 });

export default mongoose.model('Foto', fotoSchema);
