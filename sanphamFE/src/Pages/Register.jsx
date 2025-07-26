import React, { useState } from 'react';
import { Input, Button, message } from 'antd';
import { User, Mail, Lock, ArrowLeft } from 'lucide-react'; 
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';

const RegisterPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            message.error('Mật khẩu xác nhận không khớp.');
            return;
        }

        const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{6,})/;
        if (!passwordRegex.test(password)) {
            message.error('Mật khẩu phải có ít nhất 6 ký tự, bao gồm ít nhất một số và một ký tự đặc biệt.');
            return;
        }

        setLoading(true);
        const result = await register(name, email, password);
        setLoading(false);

        if (result.success) {
            message.success('Đăng ký thành công!');
            navigate('/'); 
        } else {
            message.error(result.message || 'Đăng ký thất bại.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 hover:scale-105 relative"> {/* Added relative for positioning */}
                <Link to="/" className="absolute top-4 left-4 text-gray-600 hover:text-blue-600 transition-colors duration-200">
                    <ArrowLeft size={24} />
                </Link>
                <h2 className="text-4xl font-extrabold text-center text-gray-800 mb-8 drop-shadow-sm mt-4"> {/* Adjusted margin-top */}
                    Đăng ký
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <Input
                            size="large"
                            placeholder="Tên của bạn"
                            prefix={<User className="text-gray-400" size={18} />}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <Input
                            size="large"
                            placeholder="Email"
                            prefix={<Mail className="text-gray-400" size={18} />}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            type="email"
                            required
                        />
                    </div>
                    <div>
                        <Input.Password
                            size="large"
                            placeholder="Mật khẩu"
                            prefix={<Lock className="text-gray-400" size={18} />}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <Input.Password
                            size="large"
                            placeholder="Xác nhận mật khẩu"
                            prefix={<Lock className="text-gray-400" size={18} />}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        loading={loading}
                        className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                    >
                        Đăng ký
                    </Button>
                </form>
                <div className="text-center mt-6 text-gray-600">
                    Đã có tài khoản?{' '}
                    <Link to="/login" className="text-blue-600 hover:underline font-medium">
                        Đăng nhập
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
