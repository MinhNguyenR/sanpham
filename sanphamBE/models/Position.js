// backend/models/Position.js
import mongoose from 'mongoose';

const PositionSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Vui lòng thêm tên chức vụ'],
            unique: true, // Tên chức vụ phải là duy nhất
            trim: true,
        },
        description: {
            type: String,
            default: '',
        },
        level: {
            type: String,
            enum: ['entry', 'junior', 'mid', 'senior', 'lead', 'manager', 'executive', 'other'],
            default: 'entry',
        },
    },
    {
        timestamps: true, // Tự động thêm createdAt và updatedAt
    }
);

const Position = mongoose.model('Position', PositionSchema);

export default Position;
