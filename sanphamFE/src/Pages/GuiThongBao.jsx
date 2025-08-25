import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv';
import { Button, message, Spin, Form, Input, Select, Table, Tag, Checkbox, Empty, Modal, Card, Typography } from 'antd';
import { Send, History, Trash2 } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

const GuiThongBao = () => {
    const { user, loading: authLoading } = useAuth();
    const [form] = Form.useForm();
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [sentNotifications, setSentNotifications] = useState([]);
    const [loadingSentNotifications, setLoadingSentNotifications] = useState(true);
    const [allUsers, setAllUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
    const [notificationToDelete, setNotificationToDelete] = useState(null);

    const API_URL = 'http://localhost:5000/api/auth';

    const fetchAllUsers = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            message.error('Bạn cần đăng nhập để tải danh sách người dùng.');
            setLoadingUsers(false);
            return;
        }
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const res = await axios.get(`${API_URL}/users`, config);
            setAllUsers(Array.isArray(res.data.users) ? res.data.users : Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Lỗi khi tải danh sách người dùng:', error);
            message.error(error.response?.data?.message || 'Không thể tải danh sách người dùng.');
        } finally {
            setLoadingUsers(false);
        }
    }, []);

    const fetchSentNotifications = useCallback(async () => {
        if (!user || user.role !== 'admin') return;

        setLoadingSentNotifications(true);
        const token = localStorage.getItem('token');
        if (!token) {
            message.error('Bạn cần đăng nhập để xem lịch sử thông báo đã gửi.');
            setLoadingSentNotifications(false);
            return;
        }

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const res = await axios.get(`${API_URL}/notifications/sent`, config);
            setSentNotifications(res.data);
        } catch (error) {
            console.error('Lỗi khi tải lịch sử thông báo đã gửi:', error);
            message.error(error.response?.data?.message || 'Không thể tải lịch sử thông báo đã gửi.');
        } finally {
            setLoadingSentNotifications(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && user && user.role === 'admin') {
            fetchAllUsers();
            fetchSentNotifications();
        }
    }, [user, authLoading, fetchAllUsers, fetchSentNotifications]);

    const onFinish = async (values) => {
        setLoadingSubmit(true);
        const token = localStorage.getItem('token');
        if (!token) {
            message.error('Bạn cần đăng nhập để gửi thông báo.');
            setLoadingSubmit(false);
            return;
        }

        const { receiverId, messageContent, sendToAllUsers, sendToAllAdmins } = values;

        if (!receiverId && !sendToAllUsers && !sendToAllAdmins) {
            message.error('Vui lòng chọn ít nhất một người nhận hoặc nhóm người nhận.');
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

            const payload = {
                message: messageContent,
                receiverId: receiverId || null,
                sendToAllUsers: sendToAllUsers || false,
                sendToAllAdmins: sendToAllAdmins || false,
            };

            const res = await axios.post(`${API_URL}/notifications/send`, payload, config);
            message.success(res.data.message);
            form.resetFields();
            fetchSentNotifications();
        } catch (error) {
            console.error('Lỗi khi gửi thông báo:', error);
            message.error(error.response?.data?.message || 'Gửi thông báo thất bại.');
        } finally {
            setLoadingSubmit(false);
        }
    };

    const showDeleteConfirmModal = (record) => {
        setNotificationToDelete(record);
        setIsDeleteModalVisible(true);
    };

    const handleDeleteNotification = async () => {
        if (!notificationToDelete) return;

        setLoadingSentNotifications(true);
        const token = localStorage.getItem('token');
        if (!token) {
            message.error('Bạn cần đăng nhập để xóa thông báo.');
            setLoadingSentNotifications(false);
            return;
        }

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            await axios.delete(`${API_URL}/notifications/${notificationToDelete._id}`, config);
            message.success('Thông báo đã được xóa thành công.');
            setIsDeleteModalVisible(false);
            setNotificationToDelete(null);
            fetchSentNotifications();
        } catch (error) {
            console.error('Lỗi khi xóa thông báo:', error);
            message.error(error.response?.data?.message || 'Xóa thông báo thất bại.');
        } finally {
            setLoadingSentNotifications(false);
        }
    };

    const columns = [
        {
            title: 'Người nhận',
            dataIndex: ['receiver', 'name'],
            key: 'receiverName',
            width: 250,
            render: (text, record) => {
                if (record.receiver) {
                    return (
                        <div className="flex flex-col">
                            <span className="font-medium text-gray-800">
                                {record.receiver.name || 'N/A'} {record.receiver.position ? `(${record.receiver.position})` : ''}
                            </span>
                            {record.receiver.email && (
                                <span className="text-gray-500 text-sm italic">
                                    {record.receiver.email}
                                </span>
                            )}
                        </div>
                    );
                } else if (record.type === 'admin_message' && !record.receiver) {
                    return record.receiverRole === 'admin' ? 'Tất cả Admin' : 'Tất cả User';
                }
                return 'N/A';
            },
        },
        {
            title: 'Vai trò người nhận',
            dataIndex: 'receiverRole',
            key: 'receiverRole',
            width: 120,
            render: (role) => <Tag color={role === 'admin' ? 'purple' : 'blue'}>{role}</Tag>,
        },
        {
            title: 'Nội dung thông báo',
            dataIndex: 'message',
            key: 'message',
            ellipsis: true,
            width: 300,
        },
        {
            title: 'Loại thông báo',
            dataIndex: 'type',
            key: 'type',
            width: 150,
            render: (type) => <Tag color="geekblue">{type === 'admin_message' ? 'Admin gửi' : type}</Tag>,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'isRead',
            key: 'isRead',
            render: (isRead) => (
                <Tag color={isRead ? 'default' : 'blue'}>
                    {isRead ? 'Đã xem' : 'Chưa xem'}
                </Tag>
            ),
            width: 100,
        },
        {
            title: 'Thời gian gửi',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (text) => text ? format(new Date(text), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A',
            width: 180,
        },
        {
            title: 'Hành động',
            key: 'action',
            width: 100,
            fixed: 'right',
            render: (text, record) => (
                <Button
                    icon={<Trash2 size={16} />}
                    danger
                    onClick={() => showDeleteConfirmModal(record)}
                    className="rounded-lg"
                >
                    Xóa
                </Button>
            ),
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

    if (!user || user.role !== 'admin') {
        return (
            <SBNV>
                <div className="flex items-center justify-center h-full text-2xl text-red-600">
                    Bạn không có quyền truy cập trang này.
                </div>
            </SBNV>
        );
    }

    return (
        <SBNV>
            <div className="flex flex-col items-center flex-1 min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 p-6 font-sans">
                <div className="text-center mb-8">
                    <Title level={1} className="!text-blue-700 !font-bold drop-shadow-sm mb-2">
                        Gửi Thông Báo
                    </Title>
                    <Text className="text-lg text-gray-700">
                        Chào mừng <span className="text-sky-600 font-bold">{user.name}</span>! Gửi thông báo đến người dùng hoặc toàn bộ hệ thống.
                    </Text>
                </div>

                <Card
                    title={<span className="flex items-center text-xl font-semibold text-gray-800"><Send size={20} className="mr-2" /> Tạo Thông Báo Mới</span>}
                    className="w-full max-w-3xl shadow-xl rounded-xl bg-white p-6 mb-8"
                >
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={onFinish}
                        initialValues={{ sendToAllUsers: false, sendToAllAdmins: false }}
                    >
                        <Form.Item
                            name="messageContent"
                            label="Nội dung thông báo"
                            rules={[{ required: true, message: 'Vui lòng nhập nội dung thông báo!' }]}
                        >
                            <TextArea rows={4} placeholder="Nhập nội dung thông báo bạn muốn gửi..." />
                        </Form.Item>

                        <Form.Item label="Gửi đến:" name="receiverId">
                            {loadingUsers ? (
                                <div className="flex items-center justify-center py-4">
                                    <Spin size="small" tip="Đang tải danh sách người dùng..." />
                                </div>
                            ) : (
                                <Select
                                    showSearch
                                    placeholder="Chọn người nhận cụ thể (tùy chọn)"
                                    optionFilterProp="children"
                                    allowClear
                                    filterOption={(input, option) => {
                                        const childrenText = Array.isArray(option.children)
                                            ? option.children.map(child =>
                                                typeof child === 'string' ? child : ''
                                            ).join('')
                                            : String(option.children || '');
                                        return childrenText.toLowerCase().includes(input.toLowerCase());
                                    }}
                                >
                                    {allUsers.map(u => (
                                        <Option key={u._id} value={u._id}>
                                            {u.name} ({u.email}) - {u.role} {u.position ? `(${u.position})` : ''}
                                        </Option>
                                    ))}
                                </Select>
                            )}
                        </Form.Item>

                        <Form.Item name="sendToAllUsers" valuePropName="checked">
                            <Checkbox>Gửi cho tất cả người dùng (User)</Checkbox>
                        </Form.Item>
                        <Form.Item name="sendToAllAdmins" valuePropName="checked">
                            <Checkbox>Gửi cho tất cả quản trị viên (Admin)</Checkbox>
                        </Form.Item>

                        <Form.Item className="mt-6">
                            <Button type="primary" htmlType="submit" loading={loadingSubmit} className="w-full h-10 text-lg bg-blue-600 hover:bg-blue-700 rounded-lg">
                                Gửi Thông Báo
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>

                <Card
                    title={<span className="flex items-center text-xl font-semibold text-gray-800"><History size={20} className="mr-2" /> Lịch Sử Thông Báo Đã Gửi</span>}
                    className="w-full max-w-6xl shadow-xl rounded-xl bg-white p-6"
                >
                    {loadingSentNotifications ? (
                        <div className="flex items-center justify-center py-8">
                            <Spin size="large" tip="Đang tải lịch sử thông báo đã gửi..." />
                        </div>
                    ) : (
                        sentNotifications.length > 0 ? (
                            <Table
                                columns={columns}
                                dataSource={sentNotifications}
                                rowKey="_id"
                                pagination={{ pageSize: 10 }}
                                className="shadow-md rounded-lg overflow-hidden"
                                scroll={{ x: 'max-content' }}
                            />
                        ) : (
                            <Empty description="Không có thông báo nào được gửi." />
                        )
                    )}
                </Card>

                <Modal
                    title="Xác nhận xóa thông báo"
                    open={isDeleteModalVisible}
                    onOk={handleDeleteNotification}
                    onCancel={() => setIsDeleteModalVisible(false)}
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                >
                    <p>Bạn có chắc chắn muốn xóa thông báo này không?</p>
                    {notificationToDelete && (
                        <p>Nội dung: <strong>"{notificationToDelete.message}"</strong></p>
                    )}
                </Modal>
            </div>
        </SBNV>
    );
};

export default GuiThongBao;