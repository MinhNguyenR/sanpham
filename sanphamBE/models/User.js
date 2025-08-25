import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user',
        },
        baseSalary: {
            type: Number,
            default: 0, // Mặc định là 0, admin sẽ thiết lập sau
            min: 0, // Lương cơ bản không thể là số âm
        },
        bio: { 
            type: String,
            default: '',
        },
        introduction: { 
            type: String,
            default: '',
        },
        skills: { 
            type: [String],
            default: [],
        },
        nickname: { 
            type: String,
            default: '',
        },
        position: {
            type: String,
            default: 'Nhân viên', 
        },
    },
    {
        timestamps: true,
    }
);

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;