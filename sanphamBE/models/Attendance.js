import mongoose from 'mongoose';

const attendanceSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            required: true,
        },
        position: {
            type: String,
        },
        date: {
            type: String, // Định dạng YYYY-MM-DD
            required: true,
        },
        checkInTime: {
            type: Date,
        },
        isLeave: {
            type: Boolean,
            default: false,
        },
        leaveReason: {
            type: String,
        },
        markedBy: { // Thêm trường này
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        markedByName: { // Thêm trường này để lưu tên người đánh dấu
            type: String,
        },
        markedAt: { // Thêm trường này để lưu thời gian đánh dấu
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;