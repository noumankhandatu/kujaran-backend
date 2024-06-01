const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

const generateToken = (userId, role) => {
    return jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

const authenticateUser = async (req, res, next) => {
    let token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized user' });
    }

    const tokenPrefix = 'Bearer ';
    if (token.startsWith(tokenPrefix)) {
        token = token.slice(tokenPrefix.length);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Decoded token:', decoded); 
        req.role = decoded.role; // Make sure role is set correctly here
        req.user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        req.token = token;
        next();
    } catch (error) {
        console.error('Authentication error:', error.message);
        res.status(401).json({ error: 'Unauthorized user' });
    }
};

const AuthorizeRole = (allowedRoles) => {
    return (req, res, next) => {
        // Check if user role is allowed
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Role (${req.user.role}) is not allowed to access this resource`,
            });
        }
        next();
    };
};


module.exports = { generateToken, authenticateUser, AuthorizeRole };
