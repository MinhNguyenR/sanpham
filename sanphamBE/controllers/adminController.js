// backend/controllers/adminController.js
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';

// @desc    Lấy tất cả người dùng (dùng cho các trường hợp cần trả về { users: [...] })
// @route   GET /api/auth/users
// @access  Private (Admin only)
const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find({}).select('-password');
    res.status(200).json({ users }); // Trả về một đối tượng có khóa 'users'
});

// @desc    Lấy tất cả người dùng (dùng riêng cho Quản lý nhân viên, trả về mảng trực tiếp)
// @route   GET /api/auth/users-management (route mới)
// @access  Private (Admin only)
const getAllUsersForManagement = asyncHandler(async (req, res) => {
    const users = await User.find({}).select('-password');
    res.status(200).json(users); // Trả về trực tiếp mảng người dùng
});

const updateUserByAdmin = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, email, password, role, nickname, bio, introduction, skills } = req.body;

    const user = await User.findById(id);

    if (user) {
        user.name = name || user.name;
        user.email = email || user.email;
        user.role = role || user.role;
        user.nickname = nickname !== undefined ? nickname : user.nickname;
        user.bio = bio !== undefined ? bio : user.bio;
        user.introduction = introduction !== undefined ? introduction : user.introduction;
        user.skills = skills !== undefined ? skills : user.skills;

        if (password) {
            // Kiểm tra điều kiện mật khẩu nếu mật khẩu mới được cung cấp
            const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{6,})/;
            if (!passwordRegex.test(password)) {
                res.status(400);
                throw new Error('Mật khẩu phải có ít nhất 6 ký tự, bao gồm ít nhất một số và một ký tự đặc biệt.');
            }
            user.password = password; // Mật khẩu sẽ được hash trong pre-save hook của schema User
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            nickname: updatedUser.nickname,
            bio: updatedUser.bio,
            introduction: updatedUser.introduction,
            skills: updatedUser.skills,
            createdAt: updatedUser.createdAt,
        });
    } else {
        res.status(404);
        throw new Error('User not found.');
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
        throw new Error('User not found for deletion.');
    }
});

export {
    getAllUsers,
    getAllUsersForManagement, // Export hàm mới
    updateUserByAdmin,
    deleteUserByAdmin
};
