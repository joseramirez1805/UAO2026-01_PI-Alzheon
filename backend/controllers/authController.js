import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Usuario from '../models/usuario.js';
import Configuracion from '../models/configuracion.js';
import crypto from 'crypto';
import { sendReminderEmail, buildResetPasswordHtml } from '../services/reminderMailer.js';
//.
export const register = async (req, res) => {
    try {
        const { nombre, email, password, rol } = req.body;
        
        // Validar que el usuario no exista
        const usuarioExistente = await Usuario.findOne({ email });
        if (usuarioExistente) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }
        
        // Hashear contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Crear usuario
        const nuevoUsuario = new Usuario({
            nombre,
            email,
            password: hashedPassword,
            rol: rol || 'paciente'
        });
        
        await nuevoUsuario.save();
        
        // Si es un cuidador/familiar, actualizar el paciente asociado
        if (nuevoUsuario.rol === 'cuidador/familiar' && req.body.pacienteAsociado) {
            nuevoUsuario.pacienteAsociado = req.body.pacienteAsociado;
            await nuevoUsuario.save();
            
            await Usuario.findByIdAndUpdate(
                req.body.pacienteAsociado,
                { $push: { cuidadores: nuevoUsuario._id } }
            );
        }
        
        // Crear configuración por defecto para el usuario
        if (nuevoUsuario.rol === 'paciente') {
            await Configuracion.create({
                usuarioId: nuevoUsuario._id
            });
        }
        
        // Retornar usuario sin contraseña
        const usuarioSinPassword = await Usuario.findById(nuevoUsuario._id).select('-password');
        res.status(201).json(usuarioSinPassword);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Buscar usuario por email
        const usuario = await Usuario.findOne({ email });
        if (!usuario) {
            return res.status(401).json({ msg: 'El usuario o la contraseña son incorrectas' });
        }
        
        // Verificar contraseña
        const passwordMatch = await bcrypt.compare(password, usuario.password);
        if (!passwordMatch) {
            return res.status(401).json({ msg: 'El usuario o la contraseña son incorrectas' });
        }
        
        // Crear JWT token
        const token = jwt.sign(
            { id: usuario._id, email: usuario.email },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );
        
        // Configurar cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 horas
        });
        
        res.json({ msg: 'Login exitoso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const logout = (req, res) => {
    res.clearCookie('token');
    res.json({ msg: 'Logout exitoso' });
};

export const verify = async (req, res) => {
    try {
        const token = req.cookies?.token;
        
        if (!token) {
            return res.status(401).json({ msg: 'No autenticado' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        const usuario = await Usuario.findById(decoded.id).select('-password');
        
        if (!usuario) {
            return res.status(401).json({ msg: 'Usuario no encontrado' });
        }
        
        res.json({ user: usuario });
    } catch (error) {
        res.status(401).json({ msg: 'Token inválido' });
    }
};

export const getUserInfo = async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.usuario._id)
            .select('-password')
            .populate('pacienteAsociado', 'nombre email')
            .populate('cuidadores', 'nombre email')
            .populate('pacientesAsignados', 'nombre email');
        
        res.json(usuario);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Solicitar recuperación de contraseña: genera token, guarda expiry y envía email
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ msg: 'Email requerido' });

        const usuario = await Usuario.findOne({ email });
        if (!usuario) {
            // No revelar si existe o no el email
            return res.json({ msg: 'Si el email está registrado recibirás un enlace para restablecer la contraseña' });
        }

        // Generar token y expiry (1 hora)
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000);

        usuario.resetPasswordToken = token;
        usuario.resetPasswordExpires = expires;
        await usuario.save();

        // Construir enlace al frontend
    // Preferir FRONTEND_URL, luego FRONTEND_ORIGINS (primer origen). Por defecto usar puerto 8080
    const frontendBase = process.env.FRONTEND_URL || (process.env.FRONTEND_ORIGINS ? process.env.FRONTEND_ORIGINS.split(',')[0] : 'http://localhost:8080');
        const resetLink = `${frontendBase.replace(/\/$/, '')}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

        // Enviar email
        const html = buildResetPasswordHtml(usuario.nombre, resetLink);
        await sendReminderEmail(email, 'Restablece tu contraseña - Alzheon', html);

        res.json({ msg: 'Si el email está registrado recibirás un enlace para restablecer la contraseña' });
    } catch (error) {
        console.error('forgotPassword error:', error?.message || error);
        res.status(500).json({ error: 'Error interno' });
    }
};

// Resetear contraseña: validar token y actualizar contraseña
export const resetPassword = async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;
        if (!email || !token || !newPassword) return res.status(400).json({ msg: 'Faltan parámetros' });

        const usuario = await Usuario.findOne({ email, resetPasswordToken: token });
        if (!usuario) return res.status(400).json({ msg: 'Token inválido o email incorrecto' });

        if (!usuario.resetPasswordExpires || usuario.resetPasswordExpires < new Date()) {
            return res.status(400).json({ msg: 'Token expirado' });
        }

        // Hashear nueva contraseña
        const salt = await bcrypt.genSalt(10);
        usuario.password = await bcrypt.hash(newPassword, salt);
        usuario.resetPasswordToken = undefined;
        usuario.resetPasswordExpires = undefined;
        await usuario.save();

        res.json({ msg: 'Contraseña actualizada exitosamente' });
    } catch (error) {
        console.error('resetPassword error:', error?.message || error);
        res.status(500).json({ error: 'Error interno' });
    }
};
