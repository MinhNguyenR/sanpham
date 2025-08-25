// backend/models/LeaveType.js
import mongoose from 'mongoose';

const LeaveTypeSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Vui lòng thêm tên loại hình nghỉ phép'],
            unique: true, // Tên loại hình nghỉ phép phải là duy nhất
            trim: true,
        },
        description: {
            type: String,
            default: '',
        },
        defaultDays: { // Số ngày nghỉ mặc định cho loại hình này (ví dụ: 12 ngày phép năm)
            type: Number,
            default: 0,
        },
        isPaid: { // Có phải là nghỉ phép có lương không
            type: Boolean,
            default: true,
        },
        // Có thể thêm các trường khác như: yêu cầu giấy tờ, có cần duyệt không, v.v.
    },
    {
        timestamps: true, // Tự động thêm createdAt và updatedAt
    }
);

const LeaveType = mongoose.model('LeaveType', LeaveTypeSchema);

export default LeaveType;
