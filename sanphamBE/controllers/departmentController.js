import asyncHandler from 'express-async-handler';
import Department from '../models/Department.js';
import User from '../models/User.js'; 
import { createNotification } from './notificationController.js'; 


const createDepartment = asyncHandler(async (req, res) => {
    const { name, description, headOfDepartment } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!name) {
        res.status(400);
        throw new Error('Vui lòng thêm tên phòng ban.');
    }

    // Kiểm tra xem tên phòng ban đã tồn tại chưa
    const departmentExists = await Department.findOne({ name });
    if (departmentExists) {
        res.status(400);
        throw new Error('Tên phòng ban đã tồn tại.');
    }

    // Kiểm tra headOfDepartment nếu được cung cấp
    if (headOfDepartment) {
        const headUser = await User.findById(headOfDepartment);
        if (!headUser) {
            res.status(404);
            throw new Error('Không tìm thấy người dùng được chỉ định làm trưởng phòng.');
        }
    }

    const department = await Department.create({
        name,
        description: description || '',
        headOfDepartment: headOfDepartment || null,
    });

    // --- Logic Thông báo theo thời gian thực ---
    // Thông báo cho tất cả Admin về phòng ban mới
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
        await createNotification({
            io: req.io,
            sender: req.user._id, 
            senderName: req.user.name,
            receiver: admin._id,
            receiverRole: 'admin',
            type: 'new_department',
            message: `Phòng ban mới "${department.name}" đã được tạo bởi ${req.user.name}.`,
            entityId: department._id,
            relatedDate: department.createdAt,
        });
    }
    console.log(`[departmentController] Emitted 'new_department' to admins.`);
    // --- Kết thúc Logic Thông báo ---

    res.status(201).json({
        success: true,
        message: 'Đã tạo phòng ban thành công.',
        department,
    });
});

const getAllDepartments = asyncHandler(async (req, res) => {
    const departments = await Department.find({})
        .populate('headOfDepartment', 'name email position'); // Lấy thông tin trưởng phòng

    res.status(200).json({
        success: true,
        count: departments.length,
        departments,
    });
});

const getDepartmentById = asyncHandler(async (req, res) => {
    const department = await Department.findById(req.params.id)
        .populate('headOfDepartment', 'name email position');

    if (!department) {
        res.status(404);
        throw new Error('Không tìm thấy phòng ban.');
    }

    res.status(200).json({
        success: true,
        department,
    });
});


const updateDepartment = asyncHandler(async (req, res) => {
    const { name, description, headOfDepartment } = req.body;

    const department = await Department.findById(req.params.id);

    if (!department) {
        res.status(404);
        throw new Error('Không tìm thấy phòng ban.');
    }

    // Kiểm tra tên phòng ban nếu có thay đổi và đã tồn tại
    if (name && name !== department.name) {
        const departmentExists = await Department.findOne({ name });
        if (departmentExists) {
            res.status(400);
            throw new Error('Tên phòng ban đã tồn tại.');
        }
    }

    // Kiểm tra headOfDepartment nếu được cung cấp
    if (headOfDepartment) {
        const headUser = await User.findById(headOfDepartment);
        if (!headUser) {
            res.status(404);
            throw new Error('Không tìm thấy người dùng được chỉ định làm trưởng phòng.');
        }
    } else if (headOfDepartment === null) { // Cho phép gán null để xóa trưởng phòng
        department.headOfDepartment = null;
    }


    const oldName = department.name; // Lưu tên cũ để dùng trong thông báo
    department.name = name || department.name;
    department.description = description !== undefined ? description : department.description;
    if (headOfDepartment !== undefined) { // Cập nhật nếu có giá trị hoặc null
        department.headOfDepartment = headOfDepartment;
    }

    const updatedDepartment = await department.save();

    // --- Logic Thông báo theo thời gian thực ---
    // Thông báo cho tất cả Admin về phòng ban được cập nhật
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
        await createNotification({
            io: req.io,
            sender: req.user._id,
            senderName: req.user.name,
            receiver: admin._id,
            receiverRole: 'admin',
            type: 'department_updated',
            message: `Phòng ban "${oldName}" đã được cập nhật bởi ${req.user.name}.`,
            entityId: updatedDepartment._id,
            relatedDate: updatedDepartment.updatedAt,
        });
    }
    console.log(`[departmentController] Emitted 'department_updated' to admins.`);
    // --- Kết thúc Logic Thông báo ---

    res.status(200).json({
        success: true,
        message: 'Đã cập nhật phòng ban thành công.',
        department: updatedDepartment,
    });
});

const deleteDepartment = asyncHandler(async (req, res) => {
    const department = await Department.findById(req.params.id);

    if (!department) {
        res.status(404);
        throw new Error('Không tìm thấy phòng ban.');
    }

    const departmentName = department.name; // Lưu tên trước khi xóa
    await department.deleteOne();

    // --- Logic Thông báo theo thời gian thực ---
    // Thông báo cho tất cả Admin về phòng ban bị xóa
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
        await createNotification({
            io: req.io,
            sender: req.user._id,
            senderName: req.user.name,
            receiver: admin._id,
            receiverRole: 'admin',
            type: 'department_deleted',
            message: `Phòng ban "${departmentName}" đã bị xóa bởi ${req.user.name}.`,
            entityId: null, // Không có entityId cụ thể
            relatedDate: new Date().toISOString().split('T')[0],
        });
    }
    console.log(`[departmentController] Emitted 'department_deleted' to admins.`);
    // --- Kết thúc Logic Thông báo ---

    res.status(200).json({
        success: true,
        message: 'Đã xóa phòng ban thành công.',
    });
});

export {
    createDepartment,
    getAllDepartments,
    getDepartmentById,
    updateDepartment,
    deleteDepartment,
};
