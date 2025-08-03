// backend/models/TrainingCourse.js
import mongoose from 'mongoose';

const trainingCourseSchema = mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        overview: {
            type: String,
            required: true,
            trim: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
        },
        imageUrl: {
            type: String,
            default: '', // URL của ảnh khóa học
        },
        detailedTime: {
            type: String, // Ví dụ: "Thứ 3, 10/08/2025, 9:00 AM - 12:00 PM"
            required: true,
            trim: true,
        },
        createdBy: { // Người tạo khóa học (admin)
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        mainInCharge: { // Người phụ trách chính khóa học (admin hoặc user)
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        // Trường này để theo dõi thời điểm tạo, phục vụ cho việc giới hạn chỉnh sửa 24h
        creationTime: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true, // Thêm createdAt và updatedAt tự động
    }
);

const TrainingCourse = mongoose.model('TrainingCourse', trainingCourseSchema);

export default TrainingCourse;
