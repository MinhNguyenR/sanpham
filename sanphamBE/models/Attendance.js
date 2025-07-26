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
        checkInTime: {
            type: Date,
            required: true,
            default: Date.now,
        },
        date: { 
            type: String,
            required: true,
        },
        isLeave: { 
            type: Boolean,
            default: false,
        },
        leaveReason: { 
            type: String,
            default: '',
        },
    },
    {
        timestamps: true, 
    }
);

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
