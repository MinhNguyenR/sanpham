import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { format } from 'date-fns';
import bcrypt from 'bcryptjs';
import { createNotification } from './notificationController.js'; 


const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '1h',
    });
};

const registerUser = asyncHandler(async (req, res) => {
    console.log("Full req.body received by registerUser:", req.body);

    const { name, email, password, role, nickname, bio, introduction, skills, position } = req.body; 

    if (!email || email.trim() === '') {
        res.status(400);
        throw new Error('Email không được để trống.');
    }

    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{6,})/;
    if (!passwordRegex.test(password)) {
        res.status(400);
        throw new Error('Mật khẩu phải có ít nhất 6 ký tự, bao gồm ít nhất một số và một ký tự đặc biệt.');
    }

    const userExistsByEmail = await User.findOne({ email });
    if (userExistsByEmail) {
        res.status(400);
        throw new Error('Email đã được đăng ký.');
    }

    const user = await User.create({
        name,
        email,
        password,
        role,
        nickname,
        bio,
        introduction,
        skills,
        position, 
    });

    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            nickname: user.nickname,
            bio: user.bio,
            introduction: user.introduction,
            skills: user.skills,
            position: user.position,
            token: generateToken(user._id),
            createdAt: user.createdAt,
        });
    } else {
        res.status(400);
        throw new Error('Dữ liệu người dùng không hợp lệ.');
    }
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            nickname: user.nickname,
            bio: user.bio,
            introduction: user.introduction,
            skills: user.skills,
            position: user.position, 
            token: generateToken(user._id),
            createdAt: user.createdAt,
        });
    } else {
        res.status(401);
        throw new Error('Email hoặc mật khẩu không hợp lệ.');
    }
});

const getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('-password'); 

    if (user) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            nickname: user.nickname,
            bio: user.bio,
            introduction: user.introduction,
            skills: user.skills,
            position: user.position, 
            createdAt: user.createdAt,
        });
    } else {
        res.status(404);
        throw new Error('Không tìm thấy người dùng.');
    }
});


const updateProfile = asyncHandler(async (req, res) => {
    const { name, email, password, nickname, bio, introduction, skills, position } = req.body;

    const user = await User.findById(req.user._id);

    if (user) {
        user.name = name || user.name;
        user.email = email || user.email; 
        user.nickname = nickname || user.nickname;
        user.bio = bio || user.bio;
        user.introduction = introduction || user.introduction;
        user.skills = skills || user.skills;
        user.position = position || user.position; 

        if (password) {
            const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{6,})/;
            if (!passwordRegex.test(password)) {
                res.status(400);
                throw new Error('Mật khẩu phải có ít nhất 6 ký tự, bao gồm ít nhất một số và một ký tự đặc biệt.');
            }
            user.password = password;
        }

        const updatedUser = await user.save();

        // --- Logic Thông báo ---
        if (req.io) {
            // Thông báo cho chính người dùng đó
            await createNotification({
                io: req.io, 
                sender: null, 
                senderName: 'Hệ thống',
                receiver: updatedUser._id, 
                receiverRole: updatedUser.role,
                type: 'own_profile_updated',
                message: `Bạn đã cập nhật thông tin hồ sơ cá nhân thành công.`,
                entityId: updatedUser._id,
                relatedDate: format(new Date(), 'yyyy-MM-dd'),
            });
            console.log(`[authController] Processed 'own_profile_updated' to user ${updatedUser._id}`);
        } else {
            console.warn('[authController] Đối tượng Socket.IO (req.io) không khả dụng để tạo thông báo.');
        }
        // --- Kết thúc Logic Thông báo ---

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            nickname: updatedUser.nickname,
            bio: updatedUser.bio,
            introduction: updatedUser.introduction,
            skills: updatedUser.skills,
            position: updatedUser.position,
            token: generateToken(updatedUser._id),
            createdAt: updatedUser.createdAt,
        });
    } else {
        res.status(404);
        throw new Error('Không tìm thấy người dùng');
    }
});


const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        await user.deleteOne();

        res.status(200).json({ message: 'Tài khoản đã được xóa thành công.' });
    } else {
            res.status(404);
            throw new Error('Không tìm thấy người dùng để xóa.');
        }
    });

const createAdminAccount = async () => {
    const adminEmail = 'nguyendangtuongminh555@gmail.com';
    const adminPassword = 'Tpvungtau11@';

    try {
        const adminExists = await User.findOne({ email: adminEmail });

        if (!adminExists) {
            const adminUser = await User.create({
                name: 'Minh',
                email: adminEmail,
                password: adminPassword,
                role: 'admin',
                position: 'Giám đốc',
            });
            console.log('Default admin account created:', adminUser.email);
        } else {
            console.log('Default admin account already exists.');
        }
    } catch (error) {
        console.error('Error creating default admin account:', error.message);
    }
};

export {
    registerUser,
    loginUser,
    getMe,
    updateProfile,
    deleteUser,
    createAdminAccount,
};