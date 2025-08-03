// frontend/src/Pages/GuiThongBao.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv';
import { Button, message, Spin, Form, Input, Select, Table, Tag, Checkbox, Empty, Modal } from 'antd'; // Thêm Modal
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const { TextArea } = Input;
const { Option } = Select;

const GuiThongBao = () => {
    const { user, loading: authLoading } = useAuth();
    const [form] = Form.useForm();
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [sentNotifications, setSentNotifications] = useState([]);
    const [loadingSentNotifications, setLoadingSentNotifications] = useState(true);
    const [allUsers, setAllUsers] = useState([]); // Danh sách tất cả người dùng để chọn người nhận cụ thể
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false); // State cho modal xóa
    const [notificationToDelete, setNotificationToDelete] = useState(null); // Thông báo cần xóa

    const API_URL = 'http://localhost:5000/api/auth';

    // Hàm lấy danh sách tất cả người dùng (để admin chọn người nhận cụ thể)
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
            console.log("Fetched raw data:", res.data); // Log toàn bộ dữ liệu trả về
            console.log("Fetched users (res.data.users):", res.data.users); // Log thuộc tính users

            // Cập nhật dòng này để xử lý linh hoạt hơn
            // Nếu res.data.users là một mảng, sử dụng nó
            // Nếu res.data là một mảng (tức là backend trả về trực tiếp mảng), sử dụng nó
            // Nếu không, mặc định là mảng rỗng
            setAllUsers(Array.isArray(res.data.users) ? res.data.users : Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Lỗi khi tải danh sách người dùng:', error);
            message.error(error.response?.data?.message || 'Không thể tải danh sách người dùng.');
        } finally {
            setLoadingUsers(false);
        }
    }, []);

    // Hàm lấy lịch sử thông báo đã gửi
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

        // Log giá trị để kiểm tra
        console.log("Form values on submit:", values);
        console.log("receiverId:", receiverId);
        console.log("sendToAllUsers:", sendToAllUsers);
        console.log("sendToAllAdmins:", sendToAllAdmins);


        // Đảm bảo ít nhất một tùy chọn gửi được chọn
        // Kiểm tra receiverId có giá trị và không phải là chuỗi rỗng
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
                receiverId: receiverId || null, // Gửi null nếu không chọn người cụ thể
                sendToAllUsers: sendToAllUsers || false,
                sendToAllAdmins: sendToAllAdmins || false,
            };

            const res = await axios.post(`${API_URL}/notifications/send`, payload, config);
            message.success(res.data.message);
            form.resetFields(); // Reset form sau khi gửi thành công
            fetchSentNotifications(); // Cập nhật lại lịch sử thông báo đã gửi
        } catch (error) {
            console.error('Lỗi khi gửi thông báo:', error);
            message.error(error.response?.data?.message || 'Gửi thông báo thất bại.');
        } finally {
            setLoadingSubmit(false);
        }
    };

    // Hàm hiển thị modal xác nhận xóa
    const showDeleteConfirmModal = (record) => {
        setNotificationToDelete(record);
        setIsDeleteModalVisible(true);
    };

    // Hàm xử lý xóa thông báo
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
            fetchSentNotifications(); // Cập nhật lại lịch sử
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
            // Sử dụng render để hiển thị tên người nhận hoặc nhóm
            render: (text, record) => {
                if (record.receiver) {
                    return `${record.receiver.name} (${record.receiver.email}) - ${record.receiver.role}`;
                } else if (record.type === 'admin_message' && !record.receiver) {
                    // Trường hợp thông báo gửi cho tất cả user/admin mà không có receiver cụ thể
                    // Điều này xảy ra nếu backend không populate receiver cho các thông báo gửi đến nhóm
                    // Hoặc nếu notification.receiver là null
                    return record.receiverRole === 'admin' ? 'Tất cả Admin' : 'Tất cả User';
                }
                return 'N/A';
            },
            width: 250, // Tăng chiều rộng để hiển thị đủ thông tin
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
                    type="primary"
                    danger
                    onClick={() => showDeleteConfirmModal(record)}
                    className="bg-red-500 hover:bg-red-600 rounded-lg"
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
            <div className="flex flex-col items-center flex-1 bg-gradient-to-br from-slate-50 to-slate-200 p-4">
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-black text-blue-700 drop-shadow-[0_5px_5px_rgba(0,0,0,0.2)] mb-4">
                        Gửi Thông Báo
                    </h1>
                    <p className="text-xl text-gray-700">
                        Chào mừng <span className="text-sky-600 font-bold">{user.name}</span>!
                    </p>
                </div>

                <div className="w-full max-w-3xl mt-8 bg-white p-8 rounded-lg shadow-xl mb-12">
                    <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">Tạo Thông Báo Mới</h2>
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
                                    value={form.getFieldValue('receiverId')} // Explicitly control value
                                    filterOption={(input, option) => {
                                        const childrenText = Array.isArray(option.children)
                                            ? option.children.map(child =>
                                                typeof child === 'string' ? child : ''
                                              ).join('')
                                            : String(option.children || '');
                                        return childrenText.toLowerCase().includes(input.toLowerCase());
                                    }}
                                    allowClear
                                >
                                    {allUsers.map(u => (
                                        <Option key={u._id} value={u._id}>
                                            {u.name} ({u.email}) - {u.role}
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

                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loadingSubmit} className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg">
                                Gửi Thông Báo
                            </Button>
                        </Form.Item>
                    </Form>
                </div>

                <div className="w-full max-w-6xl bg-white p-8 rounded-lg shadow-xl">
                    <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">Lịch Sử Thông Báo Đã Gửi</h2>
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
                </div>
            </div>

            {/* Modal xác nhận xóa thông báo */}
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
        </SBNV>
    );
};

export default GuiThongBao;
