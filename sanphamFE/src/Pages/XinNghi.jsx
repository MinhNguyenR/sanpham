import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv';
import { Button, message, Spin, Form, Input, DatePicker, Table, Tag, Card, Typography } from 'antd';
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import moment from 'moment';
import { FileText, Clock, CheckCircle, XCircle, Send } from 'lucide-react';

const { TextArea } = Input;
const { Title, Text } = Typography;

const XinNghi = () => {
    const { user, loading: authLoading } = useAuth();
    const [form] = Form.useForm();
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(true);

    const API_URL = 'http://localhost:5000/api/auth';

    const fetchUserLeaveRequests = useCallback(async () => {
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
    }, [user]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchUserLeaveRequests();
        }
    }, [user, authLoading, fetchUserLeaveRequests]);

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
            const requestDateFormatted = values.requestDate.format('YYYY-MM-DD');

            const res = await axios.post(
                `${API_URL}/leave-requests`,
                {
                    requestDate: requestDateFormatted,
                    reason: values.reason,
                },
                config
            );
            message.success(res.data.message);
            form.resetFields();
            fetchUserLeaveRequests();
        } catch (error) {
            console.error('Lỗi khi gửi yêu cầu nghỉ phép:', error);
            message.error(error.response?.data?.message || 'Gửi yêu cầu nghỉ phép thất bại.');
        } finally {
            setLoadingSubmit(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'green';
            case 'rejected': return 'red';
            case 'pending':
            default: return 'blue';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'approved': return <CheckCircle size={14} />;
            case 'rejected': return <XCircle size={14} />;
            case 'pending':
            default: return <Clock size={14} />;
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
                <Tag color={getStatusColor(status)} icon={getStatusIcon(status)} className="rounded-full px-3 py-1">
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
                <div className="flex items-center justify-center h-screen">
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
            <div className="flex-1 min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 p-6 font-sans">
                <div className="max-w-4xl mx-auto">
                    {/* Phần Tiêu đề chính */}
                    <div className="text-center mb-8">
                        <Title level={1} className="!text-blue-800 !font-bold drop-shadow-sm flex items-center justify-center">
                            <FileText size={48} className="mr-4 text-blue-600" />
                            Gửi Yêu Cầu Nghỉ Phép
                        </Title>
                        <Text className="text-lg text-gray-700">
                            Nếu bạn có bất kỳ vấn đề gì, hãy để lại lời nhắn cho chúng tôi.
                        </Text>
                    </div>

                    <Card
                        className="w-full max-w-2xl mx-auto shadow-2xl rounded-2xl bg-white/95 p-8 mb-12"
                        bordered={false}
                        title={<span className="text-xl font-semibold text-gray-800">Tạo Yêu Cầu Mới</span>}
                    >
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={onFinish}
                            initialValues={{ requestDate: moment() }}
                        >
                            <Form.Item
                                name="requestDate"
                                label={<span className="font-medium text-gray-700">Ngày xin nghỉ</span>}
                                rules={[{ required: true, message: 'Vui lòng chọn ngày xin nghỉ!' }]}
                            >
                                <DatePicker
                                    format="DD/MM/YYYY"
                                    className="w-full rounded-lg h-10 px-4"
                                    disabledDate={(current) => current && current < moment().startOf('day')}
                                />
                            </Form.Item>
                            <Form.Item
                                name="reason"
                                label={<span className="font-medium text-gray-700">Lý do xin nghỉ</span>}
                                rules={[{ required: true, message: 'Vui lòng nhập lý do xin nghỉ!' }]}
                            >
                                <TextArea rows={4} placeholder="Ví dụ: Nghỉ ốm, việc gia đình, du lịch..." />
                            </Form.Item>
                            <Form.Item>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={loadingSubmit}
                                    icon={<Send size={16} />}
                                    className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg"
                                >
                                    Gửi Yêu Cầu
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>

                    <Card
                        className="w-full max-w-4xl mx-auto shadow-2xl rounded-2xl bg-white/95 p-8"
                        bordered={false}
                        title={<span className="text-xl font-semibold text-gray-800">Lịch Sử Yêu Cầu Nghỉ Phép Của Bạn</span>}
                    >
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
                                className="rounded-xl overflow-hidden shadow-lg"
                                scroll={{ x: 'max-content' }}
                            />
                        )}
                    </Card>
                </div>
            </div>
        </SBNV>
    );
};

export default XinNghi;
