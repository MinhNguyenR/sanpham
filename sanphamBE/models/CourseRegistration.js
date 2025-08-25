// backend/models/CourseRegistration.js
import mongoose from 'mongoose';

const courseRegistrationSchema = mongoose.Schema(
    {
        course: { // Khóa học mà người dùng đăng ký
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TrainingCourse',
            required: true,
        },
        user: { // Người dùng đăng ký
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        phoneNumber: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        position: { // THÊM TRƯỜNG NÀY
            type: String,
            required: true, // Hoặc false tùy theo logic nghiệp vụ của bạn
        },
        notes: {
            type: String,
            default: '',
            trim: true,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
    },
    {
        timestamps: true, // Thêm createdAt và updatedAt tự động
    }
);

const CourseRegistration = mongoose.model('CourseRegistration', courseRegistrationSchema);

export default CourseRegistration;