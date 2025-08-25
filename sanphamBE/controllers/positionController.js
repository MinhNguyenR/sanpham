import asyncHandler from 'express-async-handler';
import Position from '../models/Position.js';
import User from '../models/User.js'; 
import { createNotification } from './notificationController.js'; 


const createPosition = asyncHandler(async (req, res) => {
    const { name, description, level } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!name) {
        res.status(400);
        throw new Error('Vui lòng thêm tên chức vụ.');
    }

    // Kiểm tra xem tên chức vụ đã tồn tại chưa
    const positionExists = await Position.findOne({ name });
    if (positionExists) {
        res.status(400);
        throw new Error('Tên chức vụ đã tồn tại.');
    }

    const position = await Position.create({
        name,
        description: description || '',
        level: level || 'entry',
    });

    // --- Logic Thông báo theo thời gian thực ---
    // Thông báo cho tất cả Admin về chức vụ mới
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
        await createNotification({
            io: req.io,
            sender: req.user._id, // Admin tạo
            senderName: req.user.name,
            receiver: admin._id,
            receiverRole: 'admin',
            type: 'new_position',
            message: `Chức vụ mới "${position.name}" đã được tạo bởi ${req.user.name}.`,
            entityId: position._id,
            relatedDate: position.createdAt,
        });
    }
    console.log(`[positionController] Emitted 'new_position' to admins.`);
    // --- Kết thúc Logic Thông báo ---

    res.status(201).json({
        success: true,
        message: 'Đã tạo chức vụ thành công.',
        position,
    });
});
const getAllPositions = asyncHandler(async (req, res) => {
    const positions = await Position.find({})
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: positions.length,
        positions,
    });
});

const getPositionById = asyncHandler(async (req, res) => {
    const position = await Position.findById(req.params.id);

    if (!position) {
        res.status(404);
        throw new Error('Không tìm thấy chức vụ.');
    }

    res.status(200).json({
        success: true,
        position,
    });
});

const updatePosition = asyncHandler(async (req, res) => {
    const { name, description, level } = req.body;

    const position = await Position.findById(req.params.id);

    if (!position) {
        res.status(404);
        throw new Error('Không tìm thấy chức vụ.');
    }

    // Kiểm tra tên chức vụ nếu có thay đổi và đã tồn tại
    if (name && name !== position.name) {
        const positionExists = await Position.findOne({ name });
        if (positionExists) {
            res.status(400);
            throw new Error('Tên chức vụ đã tồn tại.');
        }
    }

    const oldName = position.name; // Lưu tên cũ để dùng trong thông báo
    position.name = name || position.name;
    position.description = description !== undefined ? description : position.description;
    position.level = level || position.level;

    const updatedPosition = await position.save();

    // --- Logic Thông báo theo thời gian thực ---
    // Thông báo cho tất cả Admin về chức vụ được cập nhật
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
        await createNotification({
            io: req.io,
            sender: req.user._id,
            senderName: req.user.name,
            receiver: admin._id,
            receiverRole: 'admin',
            type: 'position_updated',
            message: `Chức vụ "${oldName}" đã được cập nhật bởi ${req.user.name}.`,
            entityId: updatedPosition._id,
            relatedDate: updatedPosition.updatedAt,
        });
    }
    console.log(`[positionController] Emitted 'position_updated' to admins.`);
    // --- Kết thúc Logic Thông báo ---

    res.status(200).json({
        success: true,
        message: 'Đã cập nhật chức vụ thành công.',
        position: updatedPosition,
    });
});

const deletePosition = asyncHandler(async (req, res) => {
    const position = await Position.findById(req.params.id);

    if (!position) {
        res.status(404);
        throw new Error('Không tìm thấy chức vụ.');
    }

    const positionName = position.name; // Lưu tên trước khi xóa
    await position.deleteOne();

    // --- Logic Thông báo theo thời gian thực ---
    // Thông báo cho tất cả Admin về chức vụ bị xóa
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
        await createNotification({
            io: req.io,
            sender: req.user._id,
            senderName: req.user.name,
            receiver: admin._id,
            receiverRole: 'admin',
            type: 'position_deleted',
            message: `Chức vụ "${positionName}" đã bị xóa bởi ${req.user.name}.`,
            entityId: null, 
            relatedDate: new Date().toISOString().split('T')[0],
        });
    }
    console.log(`[positionController] Emitted 'position_deleted' to admins.`);
    // --- Kết thúc Logic Thông báo ---

    res.status(200).json({
        success: true,
        message: 'Đã xóa chức vụ thành công.',
    });
});

export {
    createPosition,
    getAllPositions,
    getPositionById,
    updatePosition,
    deletePosition,
};
