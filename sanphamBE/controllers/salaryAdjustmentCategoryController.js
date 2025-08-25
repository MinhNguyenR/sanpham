import asyncHandler from 'express-async-handler';
import SalaryAdjustmentCategory from '../models/SalaryAdjustmentCategory.js';
import User from '../models/User.js';
import { createNotification } from './notificationController.js'; 

const createSalaryAdjustmentCategory = asyncHandler(async (req, res) => {
    const { name, type, description } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!name || !type) {
        res.status(400);
        throw new Error('Vui lòng điền đầy đủ các trường bắt buộc: Tên, Loại (thưởng/phạt).');
    }

    // Kiểm tra xem tên loại đã tồn tại chưa
    const categoryExists = await SalaryAdjustmentCategory.findOne({ name });
    if (categoryExists) {
        res.status(400);
        throw new Error('Tên loại điều chỉnh lương đã tồn tại.');
    }

    const category = await SalaryAdjustmentCategory.create({
        name,
        type,
        description: description || '',
    });

    // --- Logic Thông báo theo thời gian thực ---
    // Thông báo cho tất cả Admin về loại điều chỉnh lương mới
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
        await createNotification({
            io: req.io,
            sender: req.user._id, // Admin tạo
            senderName: req.user.name,
            receiver: admin._id,
            receiverRole: 'admin',
            type: 'new_salary_category',
            message: `Loại điều chỉnh lương mới "${category.name}" (${category.type === 'bonus' ? 'Thưởng' : 'Phạt'}) đã được tạo bởi ${req.user.name}.`,
            entityId: category._id,
            relatedDate: category.createdAt,
        });
    }
    console.log(`[salaryAdjustmentCategoryController] Emitted 'new_salary_category' to admins.`);
    // --- Kết thúc Logic Thông báo ---

    res.status(201).json({
        success: true,
        message: 'Đã tạo loại điều chỉnh lương thành công.',
        category,
    });
});

const getAllSalaryAdjustmentCategories = asyncHandler(async (req, res) => {
    const categories = await SalaryAdjustmentCategory.find({})
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: categories.length,
        categories,
    });
});

const getSalaryAdjustmentCategoryById = asyncHandler(async (req, res) => {
    const category = await SalaryAdjustmentCategory.findById(req.params.id);

    if (!category) {
        res.status(404);
        throw new Error('Không tìm thấy loại điều chỉnh lương.');
    }

    res.status(200).json({
        success: true,
        category,
    });
});

const updateSalaryAdjustmentCategory = asyncHandler(async (req, res) => {
    const { name, type, description } = req.body;

    const category = await SalaryAdjustmentCategory.findById(req.params.id);

    if (!category) {
        res.status(404);
        throw new Error('Không tìm thấy loại điều chỉnh lương.');
    }

    // Kiểm tra tên loại nếu có thay đổi và đã tồn tại
    if (name && name !== category.name) {
        const categoryExists = await SalaryAdjustmentCategory.findOne({ name });
        if (categoryExists) {
            res.status(400);
            throw new Error('Tên loại điều chỉnh lương đã tồn tại.');
        }
    }

    const oldName = category.name; // Lưu tên cũ để dùng trong thông báo
    category.name = name || category.name;
    category.type = type || category.type;
    category.description = description !== undefined ? description : category.description;

    const updatedCategory = await category.save();

    // --- Logic Thông báo theo thời gian thực ---
    // Thông báo cho tất cả Admin về loại điều chỉnh lương được cập nhật
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
        await createNotification({
            io: req.io,
            sender: req.user._id,
            senderName: req.user.name,
            receiver: admin._id,
            receiverRole: 'admin',
            type: 'salary_category_updated',
            message: `Loại điều chỉnh lương "${oldName}" đã được cập nhật bởi ${req.user.name}.`,
            entityId: updatedCategory._id,
            relatedDate: updatedCategory.updatedAt,
        });
    }
    console.log(`[salaryAdjustmentCategoryController] Emitted 'salary_category_updated' to admins.`);
    // --- Kết thúc Logic Thông báo ---

    res.status(200).json({
        success: true,
        message: 'Đã cập nhật loại điều chỉnh lương thành công.',
        category: updatedCategory,
    });
});

const deleteSalaryAdjustmentCategory = asyncHandler(async (req, res) => {
    const category = await SalaryAdjustmentCategory.findById(req.params.id);

    if (!category) {
        res.status(404);
        throw new Error('Không tìm thấy loại điều chỉnh lương.');
    }

    const categoryName = category.name; // Lưu tên trước khi xóa
    await category.deleteOne();

    // --- Logic Thông báo theo thời gian thực ---
    // Thông báo cho tất cả Admin về loại điều chỉnh lương bị xóa
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
        await createNotification({
            io: req.io,
            sender: req.user._id,
            senderName: req.user.name,
            receiver: admin._id,
            receiverRole: 'admin',
            type: 'salary_category_deleted',
            message: `Loại điều chỉnh lương "${categoryName}" đã bị xóa bởi ${req.user.name}.`,
            entityId: null, 
            relatedDate: new Date().toISOString().split('T')[0],
        });
    }
    console.log(`[salaryAdjustmentCategoryController] Emitted 'salary_category_deleted' to admins.`);
    // --- Kết thúc Logic Thông báo ---

    res.status(200).json({
        success: true,
        message: 'Đã xóa loại điều chỉnh lương thành công.',
    });
});

export {
    createSalaryAdjustmentCategory,
    getAllSalaryAdjustmentCategories,
    getSalaryAdjustmentCategoryById,
    updateSalaryAdjustmentCategory,
    deleteSalaryAdjustmentCategory,
};
