import React, { useState } from 'react';
import { Form, Input, Button, message, Typography, Card, Spin } from 'antd';
import { User, Lock, ArrowLeft, LogIn } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';

const { Title, Text } = Typography;

const LoginPage = () => {
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form] = Form.useForm();

    const onFinish = async (values) => {
        setLoading(true);
        const result = await login(values.email, values.password);
        setLoading(false);

        if (result.success) {
            message.success('Đăng nhập thành công!');
            navigate('/');
        } else {
            message.error(result.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 font-sans">
            <Card
                className="w-full max-w-md rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 relative bg-white/95"
                bordered={false}
            >
                <Link to="/" className="absolute top-4 left-4 text-gray-600 hover:text-blue-600 transition-colors duration-200">
                    <ArrowLeft size={24} />
                </Link>
                <div className="text-center">
                    <Title level={2} className="!text-4xl !font-extrabold !text-gray-800 drop-shadow-sm mt-4">
                        Đăng nhập
                    </Title>
                    <Text className="text-gray-500">
                        Chào mừng bạn trở lại! Vui lòng điền thông tin để tiếp tục.
                    </Text>
                </div>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    className="mt-6"
                >
                    <Form.Item
                        name="email"
                        rules={[
                            { required: true, message: 'Vui lòng nhập email của bạn!' },
                            { type: 'email', message: 'Email không hợp lệ!' },
                        ]}
                    >
                        <Input
                            size="large"
                            placeholder="Email"
                            prefix={<User className="text-gray-400" size={18} />}
                            className="rounded-lg border-gray-300"
                            autoComplete="username"
                        />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'Vui lòng nhập mật khẩu của bạn!' }]}
                    >
                        <Input.Password
                            size="large"
                            placeholder="Mật khẩu"
                            prefix={<Lock className="text-gray-400" size={18} />}
                            className="rounded-lg border-gray-300"
                            autoComplete="current-password"
                        />
                    </Form.Item>
                    <Form.Item className="!mb-0">
                        <Button
                            type="primary"
                            htmlType="submit"
                            size="large"
                            loading={loading}
                            icon={loading ? null : <LogIn size={18} />}
                            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 shadow-lg transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center"
                        >
                            {loading ? <Spin size="small" /> : 'Đăng nhập'}
                        </Button>
                    </Form.Item>
                </Form>
                <div className="text-center mt-6 text-gray-600">
                    Chưa có tài khoản?{' '}
                    <Link to="/register" className="text-blue-600 hover:underline font-medium">
                        Đăng ký ngay
                    </Link>
                </div>
            </Card>
        </div>
    );
};

export default LoginPage;