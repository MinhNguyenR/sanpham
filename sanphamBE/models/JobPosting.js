// backend/models/JobPosting.js
import mongoose from 'mongoose';

const JobPostingSchema = mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Vui lòng thêm tiêu đề vị trí tuyển dụng'],
            trim: true,
        },
        description: {
            type: String,
            required: [true, 'Vui lòng thêm mô tả công việc'],
        },
        requirements: {
            type: [String], // Mảng các yêu cầu
            required: [true, 'Vui lòng thêm các yêu cầu công việc'],
        },
        responsibilities: {
            type: [String], // Mảng các trách nhiệm
            required: [true, 'Vui lòng thêm các trách nhiệm công việc'],
        },
        location: {
            type: String,
            required: [true, 'Vui lòng thêm địa điểm làm việc'],
        },
        department: {
            type: String,
            required: [true, 'Vui lòng thêm phòng ban'],
        },
        salaryRange: {
            min: { type: Number, default: 0 },
            max: { type: Number, default: 0 },
        },
        employmentType: { // Loại hình làm việc (full-time, part-time, contract, internship)
            type: String,
            enum: ['full-time', 'part-time', 'contract', 'internship', 'other'],
            default: 'full-time',
        },
        experienceLevel: { // Cấp độ kinh nghiệm (entry, junior, mid, senior, lead, manager)
            type: String,
            enum: ['entry', 'junior', 'mid', 'senior', 'lead', 'manager', 'executive', 'none'],
            default: 'entry',
        },
        applicationDeadline: {
            type: Date,
            required: [true, 'Vui lòng thêm hạn chót nộp hồ sơ'],
        },
        status: { // Trạng thái của vị trí tuyển dụng (open, closed, filled)
            type: String,
            enum: ['open', 'closed', 'filled'],
            default: 'open',
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User', // Admin/HR tạo vị trí này
        },
    },
    {
        timestamps: true, // Tự động thêm createdAt và updatedAt
    }
);

const JobPosting = mongoose.model('JobPosting', JobPostingSchema);

export default JobPosting;
