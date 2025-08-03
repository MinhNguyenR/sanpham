// backend/controllers/authController.js
import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '1h',
    });
};

const registerUser = asyncHandler(async (req, res) => {
    // LOG TOÀN BỘ REQ.BODY NGAY KHI NHẬN ĐƯỢC
    console.log("Full req.body received by registerUser:", req.body);

    const { name, email, password, role, nickname, bio, introduction, skills } = req.body; // Đảm bảo lấy đủ các trường từ req.body

    // Kiểm tra xem email có tồn tại và không rỗng không
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
        throw new Error('Người dùng đã tồn tại với email này.');
    }

    // Xử lý skills thành mảng nếu nó là chuỗi
    const processedSkills = Array.isArray(skills)
        ? skills
        : (skills && typeof skills === 'string'
            ? skills.split(',').map(s => s.trim()).filter(s => s !== '')
            : []);

    const user = await User.create({
        name,
        email,
        password,
        role: role || 'user',
        nickname: nickname || '', // Lấy từ req.body, mặc định rỗng
        avatar: '', // Giữ nguyên mặc định
        bio: bio || '', // Lấy từ req.body, mặc định rỗng
        introduction: introduction || '', // Lấy từ req.body, mặc định rỗng
        skills: processedSkills, // Sử dụng processedSkills
    });

    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            nickname: user.nickname,
            avatar: user.avatar,
            bio: user.bio,
            introduction: user.introduction,
            skills: user.skills,
            token: generateToken(user._id),
        });
    } else {
        res.status(400);
        throw new Error('Dữ liệu người dùng không hợp lệ');
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
            avatar: user.avatar,
            bio: user.bio,
            introduction: user.introduction,
            skills: user.skills,
            token: generateToken(user._id),
        });
    } else {
        res.status(401);
        throw new Error('Email hoặc mật khẩu không hợp lệ');
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
            avatar: user.avatar,
            bio: user.bio,
            introduction: user.introduction,
            skills: user.skills,
            nickname: user.nickname,
            createdAt: user.createdAt,
        });
    } else {
        res.status(404);
        throw new Error('Không tìm thấy người dùng');
    }
});

const updateProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        if (req.body.name !== undefined) {
            user.name = req.body.name;
        }
        user.nickname = req.body.nickname !== undefined ? req.body.nickname : user.nickname;
        user.avatar = req.body.avatar !== undefined ? req.body.avatar : user.avatar;
        user.bio = req.body.bio !== undefined ? req.body.bio : user.bio;
        user.introduction = req.body.introduction !== undefined ? req.body.introduction : user.introduction;
        user.skills = req.body.skills !== undefined ? req.body.skills : user.skills;


        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            avatar: updatedUser.avatar,
            bio: updatedUser.bio,
            introduction: updatedUser.introduction,
            skills: updatedUser.skills,
            nickname: updatedUser.nickname,
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
    createAdminAccount,
    updateProfile,
    deleteUser,
};
