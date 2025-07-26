// frontend/src/Pages/XinNghi.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv';
import { Button, message, Spin, Form, Input, DatePicker, Table, Tag } from 'antd';
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import moment from 'moment'; // Import moment for DatePicker

const { TextArea } = Input;

const XinNghi = () => {
    const { user, loading: authLoading } = useAuth();
    const [form] = Form.useForm();
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(true);

    const API_URL = 'http://localhost:5000/api/auth'; // Đảm bảo đúng URL API

    // Hàm lấy lịch sử yêu cầu nghỉ phép của người dùng
    const fetchUserLeaveRequests = async () => {
        if (!user) return;

        setLoadingRequests(true);
        const token = localStorage.getItem('token');
        if (!token) {
            message.error('Bạn cần đăng nhập để xem lịch sử yêu cầu nghỉ phép.');
            setLoadingRequests(false);
            return;
        }

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const res = await axios.get(`${API_URL}/leave-requests/me`, config);
            setLeaveRequests(res.data);
        } catch (error) {
            console.error('Lỗi khi tải lịch sử yêu cầu nghỉ phép:', error);
            message.error(error.response?.data?.message || 'Không thể tải lịch sử yêu cầu nghỉ phép.');
        } finally {
            setLoadingRequests(false);
        }
    };

    useEffect(() => {
        if (!authLoading && user) {
            fetchUserLeaveRequests();
        }
    }, [user, authLoading]);

    const onFinish = async (values) => {
        setLoadingSubmit(true);
        const token = localStorage.getItem('token');
        if (!token) {
            message.error('Bạn cần đăng nhập để gửi yêu cầu.');
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
            const requestDateFormatted = values.requestDate.format('YYYY-MM-DD'); // Định dạng ngày

            const res = await axios.post(
                `${API_URL}/leave-requests`,
                {
                    requestDate: requestDateFormatted,
                    reason: values.reason,
                },
                config
            );
            message.success(res.data.message);
            form.resetFields(); // Reset form sau khi gửi thành công
            fetchUserLeaveRequests(); // Cập nhật lại lịch sử
        } catch (error) {
            console.error('Lỗi khi gửi yêu cầu nghỉ phép:', error);
            message.error(error.response?.data?.message || 'Gửi yêu cầu nghỉ phép thất bại.');
        } finally {
            setLoadingSubmit(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved':
                return 'green';
            case 'rejected':
                return 'red';
            case 'pending':
            default:
                return 'blue';
        }
    };

    const columns = [
        {
            title: 'Ngày xin nghỉ',
            dataIndex: 'requestDate',
            key: 'requestDate',
            render: (text) => text ? format(new Date(text), 'dd/MM/yyyy', { locale: vi }) : 'N/A',
        },
        {
            title: 'Lý do',
            dataIndex: 'reason',
            key: 'reason',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={getStatusColor(status)}>
                    {status === 'pending' ? 'Đang chờ duyệt' : status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}
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
                        Gửi Yêu Cầu Nghỉ Phép
                    </h1>
                    {user && (
                        <p className="text-xl text-gray-700">
                            Chào mừng <span className="text-sky-600 font-bold">{user.name}</span>!
                        </p>
                    )}
                </div>

                <div className="w-full max-w-2xl mt-8 bg-white p-8 rounded-lg shadow-xl mb-12">
                    <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">Tạo Yêu Cầu Mới</h2>
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={onFinish}
                        initialValues={{ requestDate: moment() }} // Mặc định ngày hiện tại
                    >
                        <Form.Item
                            name="requestDate"
                            label="Ngày xin nghỉ"
                            rules={[{ required: true, message: 'Vui lòng chọn ngày xin nghỉ!' }]}
                        >
                            <DatePicker
                                format="DD/MM/YYYY"
                                className="w-full"
                                disabledDate={(current) => current && current < moment().startOf('day')} // Không cho chọn ngày trong quá khứ
                            />
                        </Form.Item>
                        <Form.Item
                            name="reason"
                            label="Lý do xin nghỉ"
                            rules={[{ required: true, message: 'Vui lòng nhập lý do xin nghỉ!' }]}
                        >
                            <TextArea rows={4} placeholder="Ví dụ: Nghỉ ốm, việc gia đình, du lịch..." />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loadingSubmit} className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg">
                                Gửi Yêu Cầu
                            </Button>
                        </Form.Item>
                    </Form>
                </div>

                <div className="w-full max-w-4xl bg-white p-8 rounded-lg shadow-xl">
                    <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">Lịch Sử Yêu Cầu Nghỉ Phép Của Bạn</h2>
                    {loadingRequests ? (
                        <div className="flex items-center justify-center py-8">
                            <Spin size="large" tip="Đang tải lịch sử yêu cầu..." />
                        </div>
                    ) : (
                        <Table
                            columns={columns}
                            dataSource={leaveRequests}
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

export default XinNghi;
