import asyncHandler from 'express-async-handler';
import Complaint from '../models/Complaint.js';
import User from '../models/User.js'; 
import { createNotification } from './notificationController.js';
import { format } from 'date-fns'; 

const createComplaint = asyncHandler(async (req, res) => {
    const { subject, description } = req.body;
    const { _id, name, email, position } = req.user; 

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
        position, 
    });

    if (complaint) {
        // Gửi thông báo cho admin khi có khiếu nại mới
        const admins = await User.find({ role: 'admin' });
        for (const admin of admins) {
            await createNotification({
                sender: _id,
                senderName: name,
                receiver: admin._id,
                receiverRole: 'admin',
                type: 'new_complaint',
                message: `${name} đã gửi một khiếu nại mới với chủ đề: "${subject}".`,
                entityId: complaint._id,
                relatedDate: format(new Date(), 'yyyy-MM-dd'),
            });
            if (req.io) {
                req.io.to(admin._id.toString()).emit('newNotification', { type: 'new_complaint', entityId: complaint._id });
            }
        }

        res.status(201).json({
            message: 'Khiếu nại đã được gửi thành công.',
            complaint,
        });
    } else {
        res.status(400);
        throw new Error('Dữ liệu khiếu nại không hợp lệ.');
    }
});

const getUserComplaints = asyncHandler(async (req, res) => {
    const complaints = await Complaint.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(complaints);
});


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
        .populate('user', 'name email role position')
        .populate('resolvedBy', 'name') // Lấy tên admin đã giải quyết
        .sort({ createdAt: -1 });

    res.status(200).json(complaints);
});


const updateComplaintStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, adminNotes } = req.body; 

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
