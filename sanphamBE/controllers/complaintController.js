// backend/controllers/complaintController.js
import asyncHandler from 'express-async-handler';
import Complaint from '../models/Complaint.js';
import User from '../models/User.js'; // Để lấy thông tin người dùng

// @desc    Tạo khiếu nại mới
// @route   POST /api/complaints
// @access  Private (User & Admin)
const createComplaint = asyncHandler(async (req, res) => {
    const { subject, description } = req.body;
    const { _id, name, email } = req.user;

    if (!subject || !description) {
        res.status(400);
        throw new Error('Vui lòng cung cấp chủ đề và mô tả khiếu nại.');
    }

    const complaint = await Complaint.create({
        user: _id,
        name,
        email,
        subject,
        description,
        status: 'pending',
    });

    if (complaint) {
        res.status(201).json({
            message: 'Khiếu nại đã được gửi thành công.',
            complaint,
        });
    } else {
        res.status(400);
        throw new Error('Dữ liệu khiếu nại không hợp lệ.');
    }
});

// @desc    Lấy tất cả khiếu nại của người dùng hiện tại
// @route   GET /api/complaints/me
// @access  Private (User & Admin)
const getUserComplaints = asyncHandler(async (req, res) => {
    const complaints = await Complaint.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(complaints);
});

// @desc    Lấy tất cả khiếu nại (dành cho Admin)
// @route   GET /api/complaints/admin
// @access  Private (Admin only)
const getAllComplaints = asyncHandler(async (req, res) => {
    const { date } = req.query; // Lọc theo ngày (YYYY-MM-DD)

    let query = {};
    if (date) {
        // Tìm kiếm các khiếu nại được tạo trong ngày cụ thể
        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23, 59, 59, 999);

        query.createdAt = {
            $gte: startOfDay,
            $lte: endOfDay,
        };
    }

    const complaints = await Complaint.find(query)
        .populate('user', 'name email role')
        .populate('resolvedBy', 'name') // Lấy tên admin đã giải quyết
        .sort({ createdAt: -1 });

    res.status(200).json(complaints);
});

// @desc    Cập nhật trạng thái khiếu nại (Admin giải quyết)
// @route   PUT /api/complaints/:id/status
// @access  Private (Admin only)
const updateComplaintStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, adminNotes } = req.body; // status: 'resolved'

    const complaint = await Complaint.findById(id);

    if (!complaint) {
        res.status(404);
        throw new Error('Không tìm thấy khiếu nại.');
    }

    if (status !== 'resolved') {
        res.status(400);
        throw new Error('Trạng thái không hợp lệ. Phải là "resolved".');
    }

    complaint.status = status;
    complaint.adminNotes = adminNotes || '';
    complaint.resolvedBy = req.user._id;
    complaint.resolvedAt = new Date();

    const updatedComplaint = await complaint.save();

    res.status(200).json({
        message: 'Khiếu nại đã được giải quyết.',
        updatedComplaint,
    });
});

export {
    createComplaint,
    getUserComplaints,
    getAllComplaints,
    updateComplaintStatus,
};
