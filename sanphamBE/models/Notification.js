// backend/models/Notification.js
import mongoose from 'mongoose';

const notificationSchema = mongoose.Schema(
    {
        sender: { // Người gửi thông báo (có thể là User, hoặc hệ thống)
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null, // Có thể là null nếu thông báo từ hệ thống
        },
        senderName: { // Tên người gửi hoặc 'Hệ thống'
            type: String,
            required: true,
        },
        receiver: { // Người nhận thông báo (User hoặc Admin)
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        receiverRole: { // Vai trò của người nhận: 'user' hoặc 'admin'
            type: String,
            enum: ['user', 'admin'],
            required: true,
        },
        type: { // Loại thông báo: 'leave_approved', 'leave_rejected', 'complaint_resolved', 'check_in', 'new_leave_request', 'new_complaint', 'admin_message'
            type: String,
            required: true,
            enum: [
                'leave_approved',
                'leave_rejected',
                'complaint_resolved',
                'check_in', // Thông báo cho admin khi user chấm công
                'user_checked_in', // Thông báo cho user khi họ chấm công thành công
                'marked_leave', // Thông báo cho user khi admin đánh dấu nghỉ phép
                'new_leave_request', // Thông báo cho admin có đơn nghỉ phép mới
                'new_complaint', // Thông báo cho admin có khiếu nại mới
                'admin_message', // Thông báo do admin gửi thủ công
                'course_viewed', // Thông báo khi khóa học được xem
                'course_registered', // Thông báo khi có người đăng ký khóa học
                'course_registration_approved', // Thông báo khi đăng ký khóa học được duyệt
                'course_registration_rejected', // Thông báo khi đăng ký khóa học bị từ chối
                'new_evaluation_form', // Thông báo khi admin tạo bản đánh giá mới
                'new_evaluation_response', // Thông báo khi user hoàn thành bản đánh giá
                'evaluation_response_received', // Thông báo khi admin đã nhận bản đánh giá của user
            ],
        },
        message: { // Nội dung thông báo
            type: String,
            required: true,
        },
        entityId: { // ID của thực thể liên quan (ví dụ: ID của LeaveRequest, Complaint, Attendance, TrainingCourse, CourseRegistration, EvaluationForm, EvaluationResponse)
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        isRead: { // Trạng thái đã đọc/chưa đọc
            type: Boolean,
            default: false,
        },
        // Trường này sẽ lưu trữ ngày mà thông báo liên quan đến (ví dụ: ngày chấm công, ngày xin nghỉ)
        // Giúp admin lọc thông báo theo ngày một cách dễ dàng hơn
        relatedDate: {
            type: String, // YYYY-MM-DD
            default: null,
        },
    },
    {
        timestamps: true, // Thêm createdAt và updatedAt tự động
    }
);

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
