// backend/models/EvaluationForm.js
import mongoose from 'mongoose';

// Định nghĩa schema cho mỗi câu hỏi trong bản đánh giá
const questionSchema = mongoose.Schema({
    questionText: {
        type: String,
        required: true,
        trim: true,
    },
    questionType: {
        type: String,
        required: true,
        enum: ['text', 'textarea', 'radio', 'checkbox', 'number', 'rating'], // Các loại câu hỏi được hỗ trợ
    },
    isRequired: {
        type: Boolean,
        default: false,
    },
    // Các trường tùy chọn cho từng loại câu hỏi
    options: { // Dùng cho 'radio' và 'checkbox'
        type: [String], // Mảng các chuỗi (ví dụ: ["Lựa chọn A", "Lựa chọn B"])
        default: [],
    },
    min: { // Dùng cho 'number' và 'rating'
        type: Number,
        default: null,
    },
    max: { // Dùng cho 'number' và 'rating'
        type: Number,
        default: null,
    },
});

// Định nghĩa schema chính cho bản đánh giá
const evaluationFormSchema = mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: '',
        },
        dueDate: {
            type: Date,
            required: true,
        },
        questions: {
            type: [questionSchema], // Mảng các câu hỏi, mỗi câu hỏi theo questionSchema
            required: true,
        },
        createdBy: { // Người tạo bản đánh giá (admin)
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        isActive: { // Trạng thái hoạt động của bản đánh giá
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true, // Thêm createdAt và updatedAt tự động
    }
);

// Tạo virtual field để đếm số lượng phản hồi cho mỗi form
// Điều này yêu cầu bạn có model CourseRegistration và liên kết đúng
evaluationFormSchema.virtual('responsesCount', {
    ref: 'EvaluationResponse', // Tên model của phản hồi
    localField: '_id',
    foreignField: 'form',
    count: true, // Đếm số lượng tài liệu phù hợp
});

// Đảm bảo virtuals được bao gồm khi chuyển đổi sang JSON
evaluationFormSchema.set('toJSON', { virtuals: true });
evaluationFormSchema.set('toObject', { virtuals: true });


const EvaluationForm = mongoose.model('EvaluationForm', evaluationFormSchema);

export default EvaluationForm;
