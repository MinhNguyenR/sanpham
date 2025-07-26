import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import User from '../models/User.js'; 

const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                res.status(401);
                throw new Error('Không được ủy quyền, không tìm thấy người dùng');
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401);
            throw new Error('Không được ủy quyền, token không hợp lệ');
        }
    }

    if (!token) {
        res.status(401);
        throw new Error('Không được ủy quyền, không có token');
    }
});

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403);
            throw new Error(`Người dùng với vai trò ${req.user ? req.user.role : 'không xác định'} không được phép truy cập tài nguyên này`);
        }
        next();
    };
};

export { protect, authorizeRoles };