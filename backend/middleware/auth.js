import jwt from 'jsonwebtoken';
import Usuario from '../models/usuario.js';

export const authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies?.token;
        
        if (!token) {
            return res.status(401).json({ error: 'No autenticado' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        const usuario = await Usuario.findById(decoded.id).select('-password');
        
        if (!usuario) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }
        
        req.usuario = usuario;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

export const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.usuario) {
            console.log('❌ requireRole: No hay usuario');
            return res.status(401).json({ error: 'No autenticado' });
        }
        
        console.log(`🔍 requireRole: Usuario "${req.usuario.nombre}" con rol "${req.usuario.rol}" requiere ${roles.join(' | ')}`);
        
        if (!roles.includes(req.usuario.rol)) {
            console.log(`❌ requireRole: Rol no permitido. Tiene "${req.usuario.rol}", requiere one of: ${roles.join(', ')}`);
            return res.status(403).json({ error: 'No tienes permisos para esta acción' });
        }
        
        console.log(`✅ requireRole: Acceso permitido`);
        next();
    };
};
