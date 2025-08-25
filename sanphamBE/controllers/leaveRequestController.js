import asyncHandler from 'express-async-handler';
import LeaveRequest from '../models/LeaveRequest.js';
import User from '../models/User.js'; 
import { createNotification } from './notificationController.js'; 
import { format } from 'date-fns'; 


const createLeaveRequest = asyncHandler(async (req, res) => {
    const { requestDate, reason } = req.body;

    const { _id, name, email, position } = req.user; 

    if (!requestDate || !reason) {
        res.status(400);
        throw new Error('Vui lòng cung cấp ngày nghỉ phép và lý do.');
    }

    const existingRequest = await LeaveRequest.findOne({
        user: _id,
        requestDate: requestDate,
        status: { $ne: 'rejected' }
    });

    if (existingRequest) {
        res.status(400);
        throw new Error('Bạn đã có yêu cầu nghỉ phép hoặc đã được duyệt cho ngày này.');
    }

    const leaveRequest = await LeaveRequest.create({
        user: _id,
        name,
        email,
        userPosition: position, 
        requestDate,
        reason,
        status: 'pending',
    });

    if (leaveRequest) {
        const admins = await User.find({ role: 'admin' });
        for (const admin of admins) {
            await createNotification({
                sender: _id,
                senderName: name,
                receiver: admin._id,
                receiverRole: 'admin',
                type: 'new_leave_request',
                // Cập nhật tin nhắn thông báo để bao gồm chức vụ
                message: `${name} (${position}) đã gửi một yêu cầu nghỉ phép mới cho ngày ${format(new Date(requestDate), 'dd/MM/yyyy')}.`, // <-- ĐÃ THÊM 'position' VÀO MESSAGE
                entityId: leaveRequest._id,
                relatedDate: requestDate,
            });
            if (req.io) {
                req.io.to(admin._id.toString()).emit('newNotification', { type: 'new_leave_request', entityId: leaveRequest._id });
            }
        }

        res.status(201).json({
            message: 'Yêu cầu nghỉ phép đã được gửi thành công.',
            leaveRequest,
        });
    } else {
        res.status(400);
        throw new Error('Dữ liệu yêu cầu nghỉ phép không hợp lệ.');
    }
});


const getUserLeaveRequests = asyncHandler(async (req, res) => {
    const leaveRequests = await LeaveRequest.find({ user: req.user._id })
        .populate('user', 'name email position') 
        .sort({ createdAt: -1 });
    res.status(200).json(leaveRequests);
});

const getAllLeaveRequests = asyncHandler(async (req, res) => {
    const { date } = req.query;

    let query = {};
    if (date) {
        query.requestDate = date;
    }

    const leaveRequests = await LeaveRequest.find(query)
        .populate('user', 'name email role position') 
        .populate('reviewedBy', 'name')
        .sort({ createdAt: -1 });

    res.status(200).json(leaveRequests);
});


const updateLeaveRequestStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

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

    // Gửi thông báo cho người dùng khi yêu cầu nghỉ phép được duyệt/từ chối
    let notificationMessage;
    let notificationType;

    if (status === 'approved') {
        notificationMessage = `Yêu cầu nghỉ phép ngày ${format(new Date(leaveRequest.requestDate), 'dd/MM/yyyy')} của bạn đã được Admin ${req.user.name} duyệt.`;
        notificationType = 'leave_approved';
    } else { // status === 'rejected'
        notificationMessage = `Yêu cầu nghỉ phép ngày ${format(new Date(leaveRequest.requestDate), 'dd/MM/yyyy')} của bạn đã bị Admin ${req.user.name} từ chối.`;
        notificationType = 'leave_rejected';
    }

    await createNotification({
        sender: req.user._id,
        senderName: req.user.name,
        receiver: leaveRequest.user, // ID người nhận là user đã gửi yêu cầu
        receiverRole: 'user', // Giả định người gửi yêu cầu là 'user'
        type: notificationType,
        message: notificationMessage,
        entityId: updatedLeaveRequest._id,
        relatedDate: format(new Date(leaveRequest.requestDate), 'yyyy-MM-dd'),
    });

    if (req.io) {
        req.io.to(leaveRequest.user.toString()).emit('newNotification', { type: notificationType, entityId: updatedLeaveRequest._id });
        console.log(`[Notification] Emitted '${notificationType}' to user ${leaveRequest.user}`);
    } else {
        console.warn('Socket.IO (req.io) is not available to send real-time notification.');
    }

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