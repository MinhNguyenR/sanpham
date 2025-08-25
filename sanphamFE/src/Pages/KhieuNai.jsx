import React, { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv';
import { Button, message, Spin, Form, Input, Table, Tag, Card, Typography } from 'antd';
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { MessageCircle, Send } from 'lucide-react';

const { TextArea } = Input;
const { Title, Text } = Typography;

const KhieuNai = () => {
    const { user, loading: authLoading } = useAuth();
    const [form] = Form.useForm();
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [complaints, setComplaints] = useState([]);
    const [loadingComplaints, setLoadingComplaints] = useState(true);

    const API_URL = 'http://localhost:5000/api/auth'; 

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
            form.resetFields();
            fetchUserComplaints();
        } catch (error) {
            console.error('Lỗi khi gửi khiếu nại:', error);
            message.error(error.response?.data?.message || 'Gửi khiếu nại thất bại.');
        } finally {
            setLoadingSubmit(false);
        }
    };

    const getStatusInfo = (status) => {
        switch (status) {
            case 'resolved':
                return { color: 'green', text: 'Đã giải quyết' };
            case 'pending':
            default:
                return { color: 'blue', text: 'Đang chờ giải quyết' };
        }
    };

    const columns = [
        {
            title: 'Chủ đề',
            dataIndex: 'subject',
            key: 'subject',
            sorter: (a, b) => a.subject.localeCompare(b.subject),
        },
        {
            title: 'Mô tả',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
        },
        {
            title: 'Người gửi',
            key: 'senderInfo',
            render: (text, record) => (
                <div className="flex flex-col">
                    <span className="font-medium text-gray-800">
                        {record.name || 'N/A'} {record.position ? `(${record.position})` : ''}
                    </span>
                    {record.email && (
                        <span className="text-gray-500 text-sm italic">
                            {record.email}
                        </span>
                    )}
                </div>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                const statusInfo = getStatusInfo(status);
                return (
                    <Tag color={statusInfo.color} className="rounded-full">
                        {statusInfo.text}
                    </Tag>
                );
            },
            filters: [
                { text: 'Đang chờ giải quyết', value: 'pending' },
                { text: 'Đã giải quyết', value: 'resolved' },
            ],
            onFilter: (value, record) => record.status === value,
        },
        {
            title: 'Ghi chú của Admin',
            dataIndex: 'adminNotes',
            key: 'adminNotes',
            render: (text) => text || 'N/A',
            ellipsis: true,
        },
        {
            title: 'Thời gian gửi',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (text) => text ? format(new Date(text), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A',
            sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
        },
    ];

    if (authLoading) {
        return (
            <SBNV>
                <div className="flex items-center justify-center h-full min-h-screen">
                    <Spin size="large" tip="Đang tải..." />
                </div>
            </SBNV>
        );
    }

    if (!user) {
        return (
            <SBNV>
                <div className="flex items-center justify-center h-full text-2xl text-red-600">
                    Bạn cần đăng nhập để xem trang này.
                </div>
            </SBNV>
        );
    }

    return (
        <SBNV>
            <div className="flex flex-col items-center flex-1 min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 p-6 font-sans">
                <div className="text-center mb-8">
                    <Title level={1} className="!text-blue-800 !font-bold drop-shadow-sm flex items-center justify-center">
                        <MessageCircle size={48} className="mr-4 text-blue-600" />
                        Gửi Khiếu Nại
                    </Title>
                    <Text className="text-lg text-gray-700">
                        Nếu bạn có bất kỳ vấn đề gì, hãy để lại lời nhắn cho chúng tôi.
                    </Text>
                </div>

                <Card
                    className="w-full max-w-2xl shadow-2xl rounded-2xl bg-white/95 p-8 mb-12"
                    bordered={false}
                    title={<span className="text-xl font-semibold text-gray-800">Tạo Khiếu Nại Mới</span>}
                >
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={onFinish}
                    >
                        <Form.Item
                            name="subject"
                            label={<span className="font-medium text-gray-700">Chủ đề khiếu nại</span>}
                            rules={[{ required: true, message: 'Vui lòng nhập chủ đề khiếu nại!' }]}
                        >
                            <Input placeholder="Ví dụ: Lỗi hệ thống, vấn đề lương bổng..." />
                        </Form.Item>
                        <Form.Item
                            name="description"
                            label={<span className="font-medium text-gray-700">Mô tả chi tiết</span>}
                            rules={[{ required: true, message: 'Vui lòng nhập mô tả chi tiết khiếu nại!' }]}
                        >
                            <TextArea rows={4} placeholder="Mô tả chi tiết vấn đề bạn đang gặp phải..." />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loadingSubmit} icon={<Send size={16} />} className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg">
                                Gửi Khiếu Nại
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>

                <Card
                    className="w-full max-w-4xl shadow-2xl rounded-2xl bg-white/95 p-8"
                    bordered={false}
                    title={<span className="text-xl font-semibold text-gray-800">Lịch Sử Khiếu Nại Của Bạn</span>}
                >
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
                            className="rounded-xl overflow-hidden shadow-lg"
                            scroll={{ x: 'max-content' }}
                        />
                    )}
                </Card>
            </div>
        </SBNV>
    );
};

export default KhieuNai;