// backend/controllers/leaveRequestController.js
import asyncHandler from 'express-async-handler';
import LeaveRequest from '../models/LeaveRequest.js';
import User from '../models/User.js'; // Để lấy thông tin người dùng

// @desc    Tạo yêu cầu nghỉ phép mới
// @route   POST /api/leave-requests
// @access  Private (User & Admin)
const createLeaveRequest = asyncHandler(async (req, res) => {
    const { requestDate, reason } = req.body;
    const { _id, name, email } = req.user;

    if (!requestDate || !reason) {
        res.status(400);
        throw new Error('Vui lòng cung cấp ngày nghỉ phép và lý do.');
    }

    // Kiểm tra xem đã có yêu cầu nghỉ phép cho ngày này chưa
    const existingRequest = await LeaveRequest.findOne({
        user: _id,
        requestDate: requestDate,
        status: { $ne: 'rejected' } // Không cho gửi lại nếu đã được duyệt hoặc đang chờ
    });

    if (existingRequest) {
        res.status(400);
        throw new Error('Bạn đã có yêu cầu nghỉ phép hoặc đã được duyệt cho ngày này.');
    }

    const leaveRequest = await LeaveRequest.create({
        user: _id,
        name,
        email,
        requestDate,
        reason,
        status: 'pending',
    });

    if (leaveRequest) {
        res.status(201).json({
            message: 'Yêu cầu nghỉ phép đã được gửi thành công.',
            leaveRequest,
        });
    } else {
        res.status(400);
        throw new Error('Dữ liệu yêu cầu nghỉ phép không hợp lệ.');
    }
});

// @desc    Lấy tất cả yêu cầu nghỉ phép của người dùng hiện tại
// @route   GET /api/leave-requests/me
// @access  Private (User & Admin)
const getUserLeaveRequests = asyncHandler(async (req, res) => {
    const leaveRequests = await LeaveRequest.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(leaveRequests);
});

// @desc    Lấy tất cả yêu cầu nghỉ phép (dành cho Admin)
// @route   GET /api/leave-requests/admin
// @access  Private (Admin only)
const getAllLeaveRequests = asyncHandler(async (req, res) => {
    const { date } = req.query; // Lọc theo ngày (YYYY-MM-DD)

    let query = {};
    if (date) {
        query.requestDate = date;
    }

    const leaveRequests = await LeaveRequest.find(query)
        .populate('user', 'name email role')
        .populate('reviewedBy', 'name') // Lấy tên admin đã duyệt/từ chối
        .sort({ createdAt: -1 });

    res.status(200).json(leaveRequests);
});

// @desc    Cập nhật trạng thái yêu cầu nghỉ phép (Admin duyệt/từ chối)
// @route   PUT /api/leave-requests/:id/status
// @access  Private (Admin only)
const updateLeaveRequestStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, adminNotes } = req.body; // status: 'approved' hoặc 'rejected'

    const leaveRequest = await LeaveRequest.findById(id);

    if (!leaveRequest) {
        res.status(404);
        throw new Error('Không tìm thấy yêu cầu nghỉ phép.');
    }

    if (!['approved', 'rejected'].includes(status)) {
        res.status(400);
        throw new Error('Trạng thái không hợp lệ. Phải là "approved" hoặc "rejected".');
    }

    leaveRequest.status = status;
    leaveRequest.adminNotes = adminNotes || '';
    leaveRequest.reviewedBy = req.user._id;
    leaveRequest.reviewedAt = new Date();

    const updatedLeaveRequest = await leaveRequest.save();

    res.status(200).json({
        message: `Yêu cầu nghỉ phép đã được ${status === 'approved' ? 'duyệt' : 'từ chối'}.`,
        updatedLeaveRequest,
    });
});

export {
    createLeaveRequest,
    getUserLeaveRequests,
    getAllLeaveRequests,
    updateLeaveRequestStatus,
};
