import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv';
import { List, message, Spin, Button, Tag, Empty, Select, Popconfirm } from 'antd'; 
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CheckCircle, XCircle, Eye, UserPlus, BookOpen, GraduationCap, MessageSquareWarning, Send, Bell, Filter, Trash2, User, Edit, ArrowLeft } from 'lucide-react'; // Import thêm icon ArrowLeft
import { Link } from 'react-router-dom'; 

const { Option } = Select;

const API_URL = 'http://localhost:5000/api/auth';

const ThongBao = () => {
    const { user, loading: authLoading } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [markingRead, setMarkingRead] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all'); 
    const [filterType, setFilterType] = useState('all'); 

    const fetchNotifications = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
            message.error('Bạn cần đăng nhập để xem thông báo.');
            setLoading(false);
            return;
        }
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const res = await axios.get(`${API_URL}/notifications/me`, config);
            // Sắp xếp thông báo theo thời gian tạo mới nhất
            const sortedNotifications = res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setNotifications(sortedNotifications);
        } catch (error) {
            console.error('Lỗi khi tải thông báo:', error);
            message.error(error.response?.data?.message || 'Không thể tải thông báo.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchNotifications();
        }
    }, [user, authLoading, fetchNotifications]);

    const markAsRead = async (notificationId) => {
        setMarkingRead(true);
        const token = localStorage.getItem('token');
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            await axios.put(`${API_URL}/notifications/${notificationId}/read`, {}, config);
            message.success('Đã đánh dấu là đã đọc.');
            fetchNotifications(); // Tải lại danh sách thông báo để cập nhật trạng thái
        } catch (error) {
            console.error('Lỗi khi đánh dấu đã đọc:', error);
            message.error(error.response?.data?.message || 'Không thể đánh dấu đã đọc.');
        } finally {
            setMarkingRead(false);
        }
    };

    // Hàm xóa tất cả thông báo đã đọc
    const clearAllReadNotifications = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            message.error('Bạn cần đăng nhập để thực hiện thao tác này.');
            return;
        }
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            await axios.delete(`${API_URL}/notifications/read`, config);
            message.success('Đã xóa tất cả thông báo đã đọc.');
            fetchNotifications(); // Cập nhật lại danh sách thông báo
        } catch (error) {
            console.error('Lỗi khi xóa thông báo đã đọc:', error);
            message.error(error.response?.data?.message || 'Không thể xóa thông báo đã đọc.');
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'leave_approved':
                return <CheckCircle className="text-green-500" />;
            case 'leave_rejected':
                return <XCircle className="text-red-500" />;
            case 'complaint_resolved':
                return <CheckCircle className="text-green-500" />;
            case 'check_in':
                return <Eye className="text-blue-500" />; 
            case 'user_checked_in':
                return <CheckCircle className="text-green-500" />; 
            case 'marked_leave':
                return <XCircle className="text-red-500" />; 
            case 'new_leave_request':
                return <UserPlus className="text-orange-500" />; 
            case 'new_complaint':
                return <MessageSquareWarning className="text-orange-500" />; 
            case 'admin_message':
                return <Send className="text-purple-500" />;
            case 'course_viewed':
                return <Eye className="text-indigo-500" />;
            case 'course_registered':
                return <UserPlus className="text-teal-500" />; 
            case 'course_registration_approved':
                return <CheckCircle className="text-green-500" />; 
            case 'course_registration_rejected':
                return <XCircle className="text-red-500" />; 
            case 'user_profile_updated_by_admin': 
                return <User className="text-blue-500" />; 
            case 'own_profile_updated': 
                return <Edit className="text-purple-500" />; 
            default:
                return <Bell className="text-gray-500" />;
        }
    };

    // Lọc thông báo dựa trên trạng thái và loại
    const filteredNotifications = useMemo(() => {
        return notifications.filter(notification => {
            const statusMatch = filterStatus === 'all' ||
                (filterStatus === 'read' && notification.isRead) ||
                (filterStatus === 'unread' && !notification.isRead);
            const typeMatch = filterType === 'all' || notification.type === filterType;
            return statusMatch && typeMatch;
        });
    }, [notifications, filterStatus, filterType]);

    // Lấy danh sách các loại thông báo duy nhất để hiển thị trong bộ lọc
    const uniqueNotificationTypes = useMemo(() => {
        const types = new Set(notifications.map(notif => notif.type));
        return ['all', ...Array.from(types)];
    }, [notifications]);


    if (authLoading) {
        return (
            <SBNV>
                <div className="flex items-center justify-center h-full">
                    <Spin size="large" tip="Đang tải..." />
                </div>
            </SBNV>
        );
    }

    if (!user) {
        return (
            <SBNV>
                <div className="flex items-center justify-center h-full text-2xl text-red-600">
                    Bạn cần đăng nhập để xem thông báo.
                </div>
            </SBNV>
        );
    }

    return (
        <SBNV>
            <div className="flex flex-col items-center flex-1 bg-gradient-to-br from-indigo-100 to-sky-100 p-4 min-h-screen">
                <div className="animate-fadeInScale bg-white p-8 rounded-2xl shadow-2xl w-full max-w-4xl transform transition-all duration-300 hover:shadow-2xl relative">
                    <Link to="/" className="absolute top-4 left-4 text-gray-600 hover:text-blue-600 transition-colors duration-200">
                        <ArrowLeft size={24} />
                    </Link>
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-extrabold text-blue-700 drop-shadow-sm mt-4">
                            Thông Báo
                        </h1>
                        <p className="text-center text-gray-500">
                            Chào mừng <span className="text-sky-600 font-bold">{user.name}</span>! Đây là các thông báo mới nhất dành cho bạn.
                        </p>
                    </div>

                    {/* Bộ lọc và nút hành động */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-2">
                            <Filter size={18} className="text-gray-600" />
                            <span className="text-gray-700 font-medium">Lọc theo:</span>
                            <Select
                                defaultValue="all"
                                style={{ width: 120 }}
                                onChange={setFilterStatus}
                                className="rounded-lg"
                            >
                                <Option value="all">Tất cả</Option>
                                <Option value="unread">Chưa đọc</Option>
                                <Option value="read">Đã đọc</Option>
                            </Select>
                            <Select
                                defaultValue="all"
                                style={{ width: 200 }}
                                onChange={setFilterType}
                                className="rounded-lg"
                            >
                                <Option value="all">Tất cả loại</Option>
                                {uniqueNotificationTypes.map(type => (
                                    <Option key={type} value={type}>
                                        {type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} 
                                    </Option>
                                ))}
                            </Select>
                        </div>
                        <Popconfirm
                            title="Bạn có chắc chắn muốn xóa tất cả thông báo đã đọc?"
                            onConfirm={clearAllReadNotifications}
                            okText="Xóa"
                            cancelText="Hủy"
                            placement="bottomRight"
                        >
                            <Button
                                type="primary"
                                danger
                                icon={<Trash2 size={18} />}
                                className="bg-red-500 hover:bg-red-600 rounded-lg"
                                disabled={notifications.filter(n => n.isRead).length === 0} // Vô hiệu hóa nếu không có thông báo đã đọc
                            >
                                Xóa tất cả đã đọc
                            </Button>
                        </Popconfirm>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Spin size="large" tip="Đang tải thông báo..." />
                        </div>
                    ) : filteredNotifications.length > 0 ? (
                        <List
                            itemLayout="horizontal"
                            dataSource={filteredNotifications}
                            renderItem={item => (
                                <List.Item
                                    actions={[
                                        !item.isRead && (
                                            <Button
                                                key="mark-as-read"
                                                onClick={() => markAsRead(item._id)}
                                                loading={markingRead}
                                                className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                                            >
                                                Đánh dấu đã đọc
                                            </Button>
                                        ),
                                    ].filter(Boolean)}
                                    className={`p-4 rounded-lg shadow-sm mb-3 transition-all duration-300 ${item.isRead ? 'bg-gray-100 hover:bg-gray-200' : 'bg-blue-50 hover:bg-blue-100'}`}
                                >
                                    <List.Item.Meta
                                        avatar={getNotificationIcon(item.type)}
                                        title={
                                            <div className="flex items-center">
                                                <span className="font-semibold text-gray-800 mr-2">{item.message}</span>
                                                {!item.isRead && <Tag color="blue">Mới</Tag>}
                                                <Tag color="geekblue" className="ml-2">
                                                    {item.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} {/* Format type string */}
                                                </Tag>
                                            </div>
                                        }
                                        description={
                                            <div className="text-gray-600 text-sm">
                                                <p>Gửi bởi: {item.senderName} {item.senderRole && `(${item.senderRole})`}</p>
                                                <p>Thời gian: {format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}</p>
                                                {item.relatedDate && (
                                                    <p>Liên quan đến ngày: {format(new Date(item.relatedDate), 'dd/MM/yyyy', { locale: vi })}</p>
                                                )}
                                            </div>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    ) : (
                        <Empty description="Không có thông báo nào để hiển thị với bộ lọc hiện tại." />
                    )}
                </div>
            </div>
        </SBNV>
    );
};

export default ThongBao;
