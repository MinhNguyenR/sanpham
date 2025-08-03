// backend/models/EvaluationResponse.js
import mongoose from 'mongoose';

const evaluationResponseSchema = mongoose.Schema(
    {
        form: { // Tham chiếu đến bản đánh giá mà user đã trả lời
            type: mongoose.Schema.Types.ObjectId,
            ref: 'EvaluationForm',
            required: true,
        },
        user: { // Người dùng đã trả lời bản đánh giá
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        userName: { // Tên của người dùng đã trả lời (để hiển thị nhanh)
            type: String,
            required: true,
        },
        userEmail: { // Email của người dùng đã trả lời (để hiển thị nhanh)
            type: String,
            required: true,
        },
        answers: [ // Mảng các câu trả lời
            {
                questionId: { // ID của câu hỏi trong form gốc
                    type: mongoose.Schema.Types.ObjectId,
                    required: true,
                },
                questionText: { // Nội dung câu hỏi (để hiển thị lại mà không cần populate form)
                    type: String,
                    required: true,
                },
                answer: { // Câu trả lời của user (có thể là String, Number, hoặc Array cho checkbox)
                    type: mongoose.Schema.Types.Mixed, // Sử dụng Mixed để lưu trữ nhiều loại dữ liệu
                    required: true,
                },
            },
        ],
        status: { // Trạng thái của bản trả lời: 'pending' (đang chờ admin xem), 'received' (admin đã nhận)
            type: String,
            enum: ['pending', 'received'],
            default: 'pending',
        },
        adminNotes: { // Ghi chú của admin sau khi xem/nhận bản đánh giá
            type: String,
            default: '',
        },
    },
    {
        timestamps: true, // Thêm createdAt và updatedAt tự động
    }
);

const EvaluationResponse = mongoose.model('EvaluationResponse', evaluationResponseSchema);

export default EvaluationResponse;
