// backend/models/LeaveRequest.js
import mongoose from 'mongoose';

const leaveRequestSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User', // Tham chiếu đến model User
        },
        name: { // Tên người gửi yêu cầu
            type: String,
            required: true,
        },
        email: { // Email người gửi yêu cầu
            type: String,
            required: true,
        },
        requestDate: { // Ngày mà người dùng muốn xin nghỉ
            type: String, // Lưu dưới dạng YYYY-MM-DD
            required: true,
        },
        reason: { // Lý do xin nghỉ
            type: String,
            required: true,
        },
        status: { // Trạng thái của đơn: 'pending', 'approved', 'rejected'
            type: String,
            required: true,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        adminNotes: { // Ghi chú của admin khi duyệt/từ chối
            type: String,
            default: '',
        },
        reviewedBy: { // Admin duyệt/từ chối
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        reviewedAt: { // Thời gian admin duyệt/từ chối
            type: Date,
        },
    },
    {
        timestamps: true, // Thêm createdAt và updatedAt tự động
    }
);

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);

export default LeaveRequest;
