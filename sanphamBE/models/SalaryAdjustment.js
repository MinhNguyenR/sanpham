import mongoose from 'mongoose';

const SalaryAdjustmentSchema = new mongoose.Schema({
    user: { // Người dùng chịu ảnh hưởng bởi điều chỉnh này
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    recordedBy: { // Admin đã ghi nhận điều chỉnh này
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    type: { // Loại điều chỉnh: 'bonus' (thưởng) hoặc 'deduction' (trừ)
        type: String,
        enum: ['bonus', 'deduction'],
        required: true,
    },
    category: { // Phân loại: 'individual' (lỗi/thưởng riêng) hoặc 'seasonal' (thưởng dịp lễ/Tết)
        type: String,
        enum: ['individual', 'seasonal'],
        default: 'individual',
    },
    reason: { // Lý do chi tiết của thưởng/lỗi
        type: String,
        required: true,
    },
    amount: { // Số tiền thực tế của điều chỉnh (sau khi tính toán phần trăm nếu có)
        type: Number,
        required: true,
        min: 0, // Không thể có số tiền âm cho thưởng hoặc trừ
    },
    isPercentage: { // Có phải là phần trăm không?
        type: Boolean,
        default: false,
    },
    percentageValue: { // Giá trị phần trăm (ví dụ: 0.3 cho 30%)
        type: Number,
        min: 0,
        max: 1, // Tối đa 100% (được lưu dưới dạng 1)
        validate: {
            validator: function(v) {
                return this.isPercentage ? (v !== undefined && v !== null) : true;
            },
            message: 'Giá trị phần trăm là bắt buộc nếu isPercentage là true.'
        }
    },
    effectiveDate: { // Ngày mà điều chỉnh này có hiệu lực (ví dụ: ngày ghi nhận lỗi/thưởng, hoặc ngày cuối tháng cho tính lương)
        type: Date,
        required: true,
    },
}, {
    timestamps: true, // Tự động thêm createdAt và updatedAt
});

const SalaryAdjustment = mongoose.model('SalaryAdjustment', SalaryAdjustmentSchema);

export default SalaryAdjustment;