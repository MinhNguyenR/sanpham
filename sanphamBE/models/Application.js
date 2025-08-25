// backend/models/Application.js
import mongoose from 'mongoose';

const ApplicationSchema = mongoose.Schema(
    {
        jobPosting: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'JobPosting', // Tham chiếu đến vị trí tuyển dụng
        },
        applicant: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User', // Người nộp đơn (nhân viên)
        },
        applicationDate: {
            type: Date,
            default: Date.now,
        },
        status: { // Trạng thái của đơn ứng tuyển
            type: String,
            enum: ['pending', 'reviewed', 'interview_scheduled', 'offered', 'rejected', 'hired', 'withdrawn'],
            default: 'pending',
        },
        resumeUrl: { // URL đến CV/hồ sơ (nếu có hệ thống lưu trữ file)
            type: String,
            default: null,
        },
        coverLetter: { // Thư xin việc
            type: String,
            default: null,
        },
        notes: { // Ghi chú của Admin/HR về ứng viên
            type: String,
            default: null,
        },
        interviewDate: { // Ngày phỏng vấn (nếu có)
            type: Date,
            default: null,
        },
        interviewFeedback: { // Phản hồi phỏng vấn
            type: String,
            default: null,
        },
        // Có thể thêm các trường khác như: điểm đánh giá, người phỏng vấn, v.v.
    },
    {
        timestamps: true,
    }
);

// Đảm bảo mỗi người dùng chỉ có thể nộp một đơn cho một vị trí cụ thể
ApplicationSchema.index({ jobPosting: 1, applicant: 1 }, { unique: true });

const Application = mongoose.model('Application', ApplicationSchema);

export default Application;
