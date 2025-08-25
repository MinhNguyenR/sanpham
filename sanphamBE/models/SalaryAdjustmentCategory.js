// backend/models/SalaryAdjustmentCategory.js
import mongoose from 'mongoose';

const SalaryAdjustmentCategorySchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Vui lòng thêm tên loại điều chỉnh lương'],
            unique: true, // Tên loại điều chỉnh lương phải là duy nhất
            trim: true,
        },
        type: { // Loại điều chỉnh: 'bonus' (thưởng) hoặc 'deduction' (phạt)
            type: String,
            enum: ['bonus', 'deduction'],
            required: [true, 'Vui lòng chọn loại (thưởng/phạt)'],
        },
        description: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true, // Tự động thêm createdAt và updatedAt
    }
);

const SalaryAdjustmentCategory = mongoose.model('SalaryAdjustmentCategory', SalaryAdjustmentCategorySchema);

export default SalaryAdjustmentCategory;
