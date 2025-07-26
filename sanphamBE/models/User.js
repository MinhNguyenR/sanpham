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
        bio: { // THÊM TRƯỜNG NÀY
            type: String,
            default: '',
        },
        introduction: { // THÊM TRƯỜNG NÀY
            type: String,
            default: '',
        },
        skills: { // THÊM TRƯỜNG NÀY
            type: [String],
            default: [],
        },
        nickname: { // THÊM TRƯỜNG NÀY
            type: String,
            default: '',
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