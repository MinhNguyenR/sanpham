import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import { createNotification } from './notificationController.js';
import { format } from 'date-fns';

const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find({}).select('-password');
    res.status(200).json({ users });
});


const getAllUsersForManagement = asyncHandler(async (req, res) => {
    const users = await User.find({}).select('-password');
    res.status(200).json(users);
});

const updateUserByAdmin = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, email, password, role, nickname, bio, introduction, skills, position } = req.body;

    const user = await User.findById(id);

    if (user) {
        user.name = name || user.name;
        user.email = email || user.email;
        user.role = role || user.role;
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
            // Thông báo cho người dùng bị cập nhật
            await createNotification({
                io: req.io, // Truyền đối tượng io
                sender: req.user._id, // Admin là người gửi
                senderName: req.user.name,
                receiver: updatedUser._id, // Người dùng bị cập nhật
                receiverRole: updatedUser.role,
                type: 'user_profile_updated_by_admin',
                message: `Thông tin hồ sơ của bạn đã được Admin ${req.user.name} cập nhật.`,
                entityId: updatedUser._id,
                relatedDate: format(new Date(), 'yyyy-MM-dd'),
            });
            console.log(`[adminController] Processed 'user_profile_updated_by_admin' for user ${updatedUser._id}`);
            console.warn('[adminController] Đối tượng Socket.IO (req.io) không khả dụng để tạo thông báo.');
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
            createdAt: updatedUser.createdAt,
        });
    } else {
        res.status(404);
        throw new Error('Không tìm thấy người dùng.');
    }
});

const deleteUserByAdmin = asyncHandler(async (req, res) => {
    const userToDelete = await User.findById(req.params.id);

    if (userToDelete) {
        if (userToDelete.role === 'admin') {
            res.status(403);
            throw new Error('Không thể xóa tài khoản Admin.');
        }

        await userToDelete.deleteOne();
        res.status(200).json({ message: 'User account deleted successfully.' });
    } else {
        res.status(404);
        throw new Error('Không tìm thấy người dùng.');
    }
});

export {
    getAllUsers,
    getAllUsersForManagement,
    updateUserByAdmin,
    deleteUserByAdmin,
};