// frontend/src/Pages/KhieuNai.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv';
import { Button, message, Spin, Form, Input, Table, Tag } from 'antd';
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const { TextArea } = Input;

const KhieuNai = () => {
    const { user, loading: authLoading } = useAuth();
    const [form] = Form.useForm();
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [complaints, setComplaints] = useState([]);
    const [loadingComplaints, setLoadingComplaints] = useState(true);

    const API_URL = 'http://localhost:5000/api/auth'; // Đảm bảo đúng URL API

    // Hàm lấy lịch sử khiếu nại của người dùng
    const fetchUserComplaints = async () => {
        if (!user) return;

        setLoadingComplaints(true);
        const token = localStorage.getItem('token');
        if (!token) {
            message.error('Bạn cần đăng nhập để xem lịch sử khiếu nại.');
            setLoadingComplaints(false);
            return;
        }

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const res = await axios.get(`${API_URL}/complaints/me`, config);
            setComplaints(res.data);
        } catch (error) {
            console.error('Lỗi khi tải lịch sử khiếu nại:', error);
            message.error(error.response?.data?.message || 'Không thể tải lịch sử khiếu nại.');
        } finally {
            setLoadingComplaints(false);
        }
    };

    useEffect(() => {
        if (!authLoading && user) {
            fetchUserComplaints();
        }
    }, [user, authLoading]);

    const onFinish = async (values) => {
        setLoadingSubmit(true);
        const token = localStorage.getItem('token');
        if (!token) {
            message.error('Bạn cần đăng nhập để gửi khiếu nại.');
            setLoadingSubmit(false);
            return;
        }

        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            };

            const res = await axios.post(
                `${API_URL}/complaints`,
                {
                    subject: values.subject,
                    description: values.description,
                },
                config
            );
            message.success(res.data.message);
            form.resetFields(); // Reset form sau khi gửi thành công
            fetchUserComplaints(); // Cập nhật lại lịch sử
        } catch (error) {
            console.error('Lỗi khi gửi khiếu nại:', error);
            message.error(error.response?.data?.message || 'Gửi khiếu nại thất bại.');
        } finally {
            setLoadingSubmit(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'resolved':
                return 'green';
            case 'pending':
            default:
                return 'blue';
        }
    };

    const columns = [
        {
            title: 'Chủ đề',
            dataIndex: 'subject',
            key: 'subject',
        },
        {
            title: 'Mô tả',
            dataIndex: 'description',
            key: 'description',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={getStatusColor(status)}>
                    {status === 'pending' ? 'Đang chờ giải quyết' : 'Đã giải quyết'}
                </Tag>
            ),
        },
        {
            title: 'Ghi chú của Admin',
            dataIndex: 'adminNotes',
            key: 'adminNotes',
            render: (text) => text || 'N/A',
        },
        {
            title: 'Thời gian gửi',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (text) => text ? format(new Date(text), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A',
        },
    ];

    if (authLoading) {
        return (
            <SBNV>
                <div className="flex items-center justify-center h-full">
                    <Spin size="large" tip="Đang tải..." />
                </div>
            </SBNV>
        );
    }

    return (
        <SBNV>
            <div className="flex flex-col items-center flex-1 bg-gradient-to-br from-slate-50 to-slate-200 p-4">
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-black text-blue-700 drop-shadow-[0_5px_5px_rgba(0,0,0,0.2)] mb-4">
                        Gửi Khiếu Nại
                    </h1>
                    {user && (
                        <p className="text-xl text-gray-700">
                            Chào mừng <span className="text-sky-600 font-bold">{user.name}</span>!
                        </p>
                    )}
                </div>

                <div className="w-full max-w-2xl mt-8 bg-white p-8 rounded-lg shadow-xl mb-12">
                    <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">Tạo Khiếu Nại Mới</h2>
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={onFinish}
                    >
                        <Form.Item
                            name="subject"
                            label="Chủ đề khiếu nại"
                            rules={[{ required: true, message: 'Vui lòng nhập chủ đề khiếu nại!' }]}
                        >
                            <Input placeholder="Ví dụ: Lỗi hệ thống, vấn đề lương bổng..." />
                        </Form.Item>
                        <Form.Item
                            name="description"
                            label="Mô tả chi tiết"
                            rules={[{ required: true, message: 'Vui lòng nhập mô tả chi tiết khiếu nại!' }]}
                        >
                            <TextArea rows={4} placeholder="Mô tả chi tiết vấn đề bạn đang gặp phải..." />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loadingSubmit} className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg">
                                Gửi Khiếu Nại
                            </Button>
                        </Form.Item>
                    </Form>
                </div>

                <div className="w-full max-w-4xl bg-white p-8 rounded-lg shadow-xl">
                    <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">Lịch Sử Khiếu Nại Của Bạn</h2>
                    {loadingComplaints ? (
                        <div className="flex items-center justify-center py-8">
                            <Spin size="large" tip="Đang tải lịch sử khiếu nại..." />
                        </div>
                    ) : (
                        <Table
                            columns={columns}
                            dataSource={complaints}
                            rowKey="_id"
                            pagination={{ pageSize: 5 }}
                            className="shadow-md rounded-lg overflow-hidden"
                        />
                    )}
                </div>
            </div>
        </SBNV>
    );
};

export default KhieuNai;
