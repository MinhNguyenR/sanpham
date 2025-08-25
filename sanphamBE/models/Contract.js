// backend/models/Contract.js
import mongoose from 'mongoose';

const ContractSchema = mongoose.Schema(
    {
        user: { // Nhân viên mà hợp đồng này thuộc về
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Hợp đồng phải thuộc về một nhân viên.'],
        },
        contractType: { // Loại hợp đồng (ví dụ: thử việc, chính thức, cộng tác viên, thời vụ)
            type: String,
            enum: ['probationary', 'official', 'collaborator', 'seasonal', 'internship', 'other'],
            required: [true, 'Vui lòng chọn loại hợp đồng.'],
        },
        contractCode: { // Mã hợp đồng (ví dụ: HDLD-2023-001)
            type: String,
            unique: true,
            trim: true,
            required: [true, 'Vui lòng cung cấp mã hợp đồng.'],
        },
        startDate: { // Ngày bắt đầu hợp đồng
            type: Date,
            required: [true, 'Vui lòng cung cấp ngày bắt đầu hợp đồng.'],
        },
        endDate: { // Ngày kết thúc hợp đồng (có thể null nếu là hợp đồng không thời hạn)
            type: Date,
            default: null,
        },
        duration: { // Thời hạn hợp đồng (ví dụ: 12 tháng, 2 năm, không thời hạn). Có thể tính toán từ startDate và endDate
            type: String,
            default: 'Không thời hạn',
        },
        salary: { // Mức lương cơ bản tại thời điểm ký hợp đồng (có thể tham chiếu từ User.baseSalary)
            type: Number,
            required: [true, 'Vui lòng cung cấp mức lương cơ bản.'],
            min: [0, 'Lương không thể là số âm.'],
        },
        position: { // Chức vụ tại thời điểm ký hợp đồng
            type: String,
            required: [true, 'Vui lòng cung cấp chức vụ.'],
        },
        description: { // Mô tả thêm về hợp đồng
            type: String,
            default: '',
        },
        fileUrl: { // URL đến file hợp đồng đính kèm (PDF, Word)
            type: String,
            default: null, // Có thể là null nếu chỉ lưu thông tin
        },
        status: { // Trạng thái hợp đồng (còn hiệu lực, đã hết hạn, đã chấm dứt, sắp hết hạn)
            type: String,
            enum: ['active', 'expired', 'terminated', 'pending', 'renewed'],
            default: 'active',
        },
        // Trường này lưu trữ ID của người dùng đã tạo/cập nhật hợp đồng (thường là Admin)
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true, // Tự động thêm createdAt và updatedAt
    }
);

// Middleware để cập nhật trạng thái hợp đồng dựa trên ngày kết thúc
ContractSchema.pre('save', function (next) {
    const today = new Date();
    if (this.endDate && this.endDate < today && this.status === 'active') {
        this.status = 'expired';
    }
    next();
});

const Contract = mongoose.model('Contract', ContractSchema);

export default Contract;
