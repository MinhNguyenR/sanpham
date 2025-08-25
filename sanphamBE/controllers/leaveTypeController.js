import asyncHandler from 'express-async-handler';
import LeaveType from '../models/LeaveType.js';
import User from '../models/User.js'; 
import { createNotification } from './notificationController.js'; 


const createLeaveType = asyncHandler(async (req, res) => {
    const { name, description, defaultDays, isPaid } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!name || defaultDays === undefined || isPaid === undefined) {
        res.status(400);
        throw new Error('Vui lòng điền đầy đủ các trường bắt buộc: Tên, Số ngày mặc định, Có lương.');
    }

    // Kiểm tra xem tên loại hình đã tồn tại chưa
    const leaveTypeExists = await LeaveType.findOne({ name });
    if (leaveTypeExists) {
        res.status(400);
        throw new Error('Tên loại hình nghỉ phép đã tồn tại.');
    }

    const leaveType = await LeaveType.create({
        name,
        description: description || '',
        defaultDays,
        isPaid,
    });

    // --- Logic Thông báo theo thời gian thực ---
    // Thông báo cho tất cả Admin về loại hình nghỉ phép mới
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
        await createNotification({
            io: req.io,
            sender: req.user._id, // Admin tạo
            senderName: req.user.name,
            receiver: admin._id,
            receiverRole: 'admin',
            type: 'new_leave_type',
            message: `Loại hình nghỉ phép mới "${leaveType.name}" (mặc định ${leaveType.defaultDays} ngày) đã được tạo bởi ${req.user.name}.`,
            entityId: leaveType._id,
            relatedDate: leaveType.createdAt,
        });
    }
    console.log(`[leaveTypeController] Emitted 'new_leave_type' to admins.`);
    // --- Kết thúc Logic Thông báo ---

    res.status(201).json({
        success: true,
        message: 'Đã tạo loại hình nghỉ phép thành công.',
        leaveType,
    });
});

const getAllLeaveTypes = asyncHandler(async (req, res) => {
    const leaveTypes = await LeaveType.find({})
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: leaveTypes.length,
        leaveTypes,
    });
});

const getLeaveTypeById = asyncHandler(async (req, res) => {
    const leaveType = await LeaveType.findById(req.params.id);

    if (!leaveType) {
        res.status(404);
        throw new Error('Không tìm thấy loại hình nghỉ phép.');
    }

    res.status(200).json({
        success: true,
        leaveType,
    });
});

const updateLeaveType = asyncHandler(async (req, res) => {
    const { name, description, defaultDays, isPaid } = req.body;

    const leaveType = await LeaveType.findById(req.params.id);

    if (!leaveType) {
        res.status(404);
        throw new Error('Không tìm thấy loại hình nghỉ phép.');
    }

    // Kiểm tra tên loại hình nếu có thay đổi và đã tồn tại
    if (name && name !== leaveType.name) {
        const leaveTypeExists = await LeaveType.findOne({ name });
        if (leaveTypeExists) {
            res.status(400);
            throw new Error('Tên loại hình nghỉ phép đã tồn tại.');
        }
    }

    const oldName = leaveType.name; // Lưu tên cũ để dùng trong thông báo
    leaveType.name = name || leaveType.name;
    leaveType.description = description !== undefined ? description : leaveType.description;
    leaveType.defaultDays = defaultDays !== undefined ? defaultDays : leaveType.defaultDays;
    leaveType.isPaid = isPaid !== undefined ? isPaid : leaveType.isPaid;

    const updatedLeaveType = await leaveType.save();

    // --- Logic Thông báo theo thời gian thực ---
    // Thông báo cho tất cả Admin về loại hình nghỉ phép được cập nhật
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
        await createNotification({
            io: req.io,
            sender: req.user._id,
            senderName: req.user.name,
            receiver: admin._id,
            receiverRole: 'admin',
            type: 'leave_type_updated',
            message: `Loại hình nghỉ phép "${oldName}" đã được cập nhật bởi ${req.user.name}.`,
            entityId: updatedLeaveType._id,
            relatedDate: updatedLeaveType.updatedAt,
        });
    }
    console.log(`[leaveTypeController] Emitted 'leave_type_updated' to admins.`);
    // --- Kết thúc Logic Thông báo ---

    res.status(200).json({
        success: true,
        message: 'Đã cập nhật loại hình nghỉ phép thành công.',
        leaveType: updatedLeaveType,
    });
});

const deleteLeaveType = asyncHandler(async (req, res) => {
    const leaveType = await LeaveType.findById(req.params.id);

    if (!leaveType) {
        res.status(404);
        throw new Error('Không tìm thấy loại hình nghỉ phép.');
    }

    const leaveTypeName = leaveType.name; // Lưu tên trước khi xóa
    await leaveType.deleteOne();

    // --- Logic Thông báo theo thời gian thực ---
    // Thông báo cho tất cả Admin về loại hình nghỉ phép bị xóa
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
        await createNotification({
            io: req.io,
            sender: req.user._id,
            senderName: req.user.name,
            receiver: admin._id,
            receiverRole: 'admin',
            type: 'leave_type_deleted',
            message: `Loại hình nghỉ phép "${leaveTypeName}" đã bị xóa bởi ${req.user.name}.`,
            entityId: null, 
            relatedDate: new Date().toISOString().split('T')[0],
        });
    }
    console.log(`[leaveTypeController] Emitted 'leave_type_deleted' to admins.`);
    // --- Kết thúc Logic Thông báo ---

    res.status(200).json({
        success: true,
        message: 'Đã xóa loại hình nghỉ phép thành công.',
    });
});

export {
    createLeaveType,
    getAllLeaveTypes,
    getLeaveTypeById,
    updateLeaveType,
    deleteLeaveType,
};
