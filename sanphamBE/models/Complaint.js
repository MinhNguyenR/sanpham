// backend/models/Complaint.js
import mongoose from 'mongoose';

const complaintSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User', // Tham chiếu đến model User
        },
        name: { // Tên người gửi khiếu nại
            type: String,
            required: true,
        },
        email: { // Email người gửi khiếu nại
            type: String,
            required: true,
        },
        position: { // THÊM TRƯỜNG NÀY
            type: String,
            required: true, // Hoặc false tùy theo logic nghiệp vụ của bạn
        },
        subject: { // Chủ đề khiếu nại
            type: String,
            required: true,
        },
        description: { // Mô tả chi tiết khiếu nại
            type: String,
            required: true,
        },
        status: { // Trạng thái của khiếu nại: 'pending', 'resolved'
            type: String,
            required: true,
            enum: ['pending', 'resolved'],
            default: 'pending',
        },
        adminNotes: { // Ghi chú của admin khi giải quyết
            type: String,
            default: '',
        },
        resolvedBy: { // Admin giải quyết
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        resolvedAt: { // Thời gian admin giải quyết
            type: Date,
        },
    },
    {
        timestamps: true, // Thêm createdAt và updatedAt tự động
    }
);

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;