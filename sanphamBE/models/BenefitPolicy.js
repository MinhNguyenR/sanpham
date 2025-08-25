// backend/models/BenefitPolicy.js
import mongoose from 'mongoose';

const BenefitPolicySchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Vui lòng thêm tên chính sách phúc lợi'],
            trim: true,
            unique: true, // Tên chính sách nên là duy nhất
        },
        description: {
            type: String,
            required: [true, 'Vui lòng thêm mô tả cho chính sách phúc lợi'],
        },
        type: {
            type: String,
            required: [true, 'Vui lòng chọn loại phúc lợi'],
            enum: [
                'health_insurance', // Bảo hiểm y tế
                'transport_allowance', // Trợ cấp đi lại
                'meal_allowance', // Trợ cấp ăn uống
                'paid_leave', // Nghỉ phép có lương
                'bonus', // Thưởng (chung, không phải thưởng lương)
                'training_development', // Đào tạo & phát triển
                'wellness_program', // Chương trình chăm sóc sức khỏe
                'other', // Khác
            ],
            default: 'other',
        },
        value: {
            type: Number,
            default: 0, // Giá trị của phúc lợi (ví dụ: số tiền, số ngày nghỉ)
        },
        isMonetary: {
            type: Boolean,
            default: false, // Xác định xem phúc lợi này có phải là tiền tệ không
        },
        effectiveDate: {
            type: Date,
            required: [true, 'Vui lòng thêm ngày hiệu lực của chính sách'],
        },
        endDate: {
            type: Date,
            default: null, // Ngày kết thúc hiệu lực (nếu có)
        },
        eligibilityCriteria: {
            type: String,
            default: 'Tất cả nhân viên', // Tiêu chí đủ điều kiện (ví dụ: "Nhân viên toàn thời gian", "Sau 6 tháng làm việc")
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User', // Tham chiếu đến người dùng đã tạo chính sách này (admin/HR)
        },
    },
    {
        timestamps: true, // Tự động thêm createdAt và updatedAt
    }
);

const BenefitPolicy = mongoose.model('BenefitPolicy', BenefitPolicySchema);

export default BenefitPolicy;
