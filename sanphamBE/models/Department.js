// backend/models/Department.js
import mongoose from 'mongoose';

const DepartmentSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Vui lòng thêm tên phòng ban'],
            unique: true, // Tên phòng ban phải là duy nhất
            trim: true,
        },
        description: {
            type: String,
            default: '',
        },
        headOfDepartment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    {
        timestamps: true, // Tự động thêm createdAt và updatedAt
    }
);

const Department = mongoose.model('Department', DepartmentSchema);

export default Department;
