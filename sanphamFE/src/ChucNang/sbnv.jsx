// frontend/src/ChucNnang/sbnv.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Avatar, Input, Button, Spin, Menu, Badge, message } from "antd"; // Import message
import {
    Bell, LogIn, UserPlus, User, LogOut, Clock, Users, DollarSign, BarChart,
    FileText, List, Send,
    CalendarPlus,
    Flag,
    ClipboardList,
    MessageSquareWarning,
    BookOpen, // Icon cho khóa đào tạo
    GraduationCap, // Icon khác cho khóa đào tạo
    CheckSquare, // Icon cho đánh giá
} from "lucide-react";
import { SettingOutlined } from '@ant-design/icons';
import { useAuth } from '../Context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/auth';
const SOCKET_URL = 'http://localhost:5000';

let socket;

const SBNV = ({ children }) => {
    const { user, logout, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

    const handleLogout = () => {
        logout();
        navigate('/login');
        if (socket) {
            socket.disconnect();
            socket = null;
        }
    };

    const fetchUnreadNotificationsCount = useCallback(async () => {
        if (!user) {
            setUnreadNotificationsCount(0);
            return;
        }
        const token = localStorage.getItem('token');
        if (!token) {
            setUnreadNotificationsCount(0);
            return;
        }
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const res = await axios.get(`${API_URL}/notifications/me`, config);
            const unreadCount = res.data.filter(notif => !notif.isRead).length;
            setUnreadNotificationsCount(unreadCount);
        } catch (error) {
            console.error('Lỗi khi tải số lượng thông báo chưa đọc:', error);
            setUnreadNotificationsCount(0);
        }
    }, [user]);

    useEffect(() => {
        if (!user || loading) {
            if (socket) {
                socket.disconnect();
                socket = null;
            }
            setUnreadNotificationsCount(0);
            return;
        }

        fetchUnreadNotificationsCount();

        if (!socket) {
            socket = io(SOCKET_URL, {
                auth: { token: localStorage.getItem('token') },
                transports: ['websocket', 'polling']
            });

            socket.on('connect', () => {
                console.log('Socket.IO đã kết nối từ SBNV');
                socket.emit('joinRoom', user._id);
            });

            socket.on('newNotification', (newNotif) => {
                console.log('Thông báo mới nhận được từ SBNV:', newNotif);
                // Hiển thị thông báo pop-up
                message.info('Bạn có thông báo mới!');
                fetchUnreadNotificationsCount(); // Cập nhật lại số lượng thông báo chưa đọc
            });

            socket.on('disconnect', () => {
                console.log('Socket.IO đã ngắt kết nối từ SBNV');
            });

            socket.on('connect_error', (err) => {
                console.error('Lỗi kết nối Socket.IO từ SBNV:', err.message);
            });
        } else {
            // Nếu socket đã tồn tại nhưng user thay đổi (ví dụ: đăng nhập lại)
            // Đảm bảo user mới tham gia đúng phòng của họ
            socket.emit('joinRoom', user._id);
        }

        return () => {
            // Không ngắt kết nối socket ở đây nếu muốn giữ kết nối trên các trang khác
            // Tuy nhiên, nếu bạn muốn ngắt kết nối khi component unmount, hãy thêm:
            // if (socket) {
            //     socket.disconnect();
            //     socket = null;
            // }
        };
    }, [user, loading, fetchUnreadNotificationsCount]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen text-xl text-slate-700">
                <Spin size="large" tip="Đang tải..." />
            </div>
        );
    }

    const menuItems = user ? [
        {
            key: '/',
            icon: <Bell className="w-5 h-5 mr-2" />,
            label: <Link to="/">Dashboard</Link>,
        },
        user.role === 'admin' ? {
            key: 'sub-chamcong',
            icon: <Clock className="w-5 h-5 mr-2" />,
            label: 'Chấm công',
            children: [
                {
                    key: '/chamcong',
                    label: <Link to="/chamcong">Chấm công cá nhân</Link>,
                },
                {
                    key: '/quanlychamcong',
                    label: <Link to="/quanlychamcong">Quản lý chấm công</Link>,
                },
            ],
        } : {
            key: '/chamcong',
            icon: <Clock className="w-5 h-5 mr-2" />,
            label: <Link to="/chamcong">Chấm công</Link>,
        },
        user.role === 'admin' && {
            key: '/quanlynhanvien',
            icon: <Users className="w-5 h-5 mr-2" />,
            label: <Link to="/quanlynhanvien">Quản lý nhân viên</Link>,
        },
        {
            key: 'sub-leave-complaint',
            icon: <FileText className="w-5 h-5 mr-2" />,
            label: 'Nghỉ phép / Khiếu nại',
            children: [
                {
                    key: '/xinnghi',
                    label: <Link to="/xinnghi">Gửi yêu cầu nghỉ phép</Link>,
                },
                {
                    key: '/khieunai',
                    label: <Link to="/khieunai">Gửi khiếu nại</Link>,
                },
                user.role === 'admin' && {
                    key: '/quanlyxinnghi',
                    label: <Link to="/quanlyxinnghi">Quản lý yêu cầu nghỉ phép</Link>,
                },
                user.role === 'admin' && {
                    key: '/quanlykhieunai',
                    label: <Link to="/quanlykhieunai">Quản lý khiếu nại</Link>,
                },
            ].filter(Boolean),
        },
        // Thêm mục "Khóa đào tạo"
        {
            key: 'sub-training-courses',
            icon: <GraduationCap className="w-5 h-5 mr-2" />, // Hoặc BookOpen
            label: 'Khóa đào tạo',
            children: [
                {
                    key: '/khoahoc',
                    label: <Link to="/khoahoc">Xem khóa đào tạo</Link>,
                },
                user.role === 'admin' && {
                    key: '/quanlykhoahoc',
                    label: <Link to="/quanlykhoahoc">Quản lý khóa đào tạo</Link>,
                },
            ].filter(Boolean),
        },
        // Thêm mục "Đánh giá"
        user.role === 'admin' ? {
            key: 'sub-evaluation',
            icon: <CheckSquare className="w-5 h-5 mr-2" />,
            label: 'Đánh giá',
            children: [
                {
                    key: '/danhgia',
                    label: <Link to="/danhgia">Bản đánh giá của bạn</Link>,
                },
                {
                    key: '/quanlydanhgia',
                    label: <Link to="/quanlydanhgia">Quản lý đánh giá</Link>,
                },
            ],
        } : {
            key: '/danhgia',
            icon: <CheckSquare className="w-5 h-5 mr-2" />,
            label: <Link to="/danhgia">Đánh giá</Link>,
        },
        user.role === 'admin' && {
            key: '/guithongbao',
            icon: <Send className="w-5 h-5 mr-2" />,
            label: <Link to="/guithongbao">Gửi thông báo</Link>,
        },
        {
            key: '/luongthuong',
            icon: <DollarSign className="w-5 h-5 mr-2" />,
            label: 'Lương & Thưởng',
            disabled: true,
        },
        {
            key: '/baocao',
            icon: <BarChart className="w-5 h-5 mr-2" />,
            label: 'Báo cáo',
            disabled: true,
        },
        {
            key: '/caidat',
            icon: <SettingOutlined className="w-5 h-5 mr-2" />,
            label: <Link to="/caidat">Cài đặt</Link>,
        },
    ].filter(Boolean) : [];

    const getDefaultOpenKeys = () => {
        if (!user) return [];

        if (location.pathname.startsWith('/chamcong') || location.pathname.startsWith('/quanlychamcong')) {
            return ['sub-chamcong'];
        }
        if (location.pathname.startsWith('/xinnghi') || location.pathname.startsWith('/khieunai') ||
            location.pathname.startsWith('/quanlyxinnghi') || location.pathname.startsWith('/quanlykhieunai')) {
            return ['sub-leave-complaint'];
        }
        if (location.pathname.startsWith('/khoahoc') || location.pathname.startsWith('/quanlykhoahoc')) {
            return ['sub-training-courses'];
        }
        if (location.pathname.startsWith('/danhgia') || location.pathname.startsWith('/quanlydanhgia')) {
            return ['sub-evaluation'];
        }
        return [];
    };

    return (
        <div className="flex h-screen overflow-hidden">
            <aside className="w-60 bg-gradient-to-b from-slate-800 to-slate-900 text-white fixed h-full shadow-xl z-10">
                <div className="p-6 text-2xl font-bold border-b border-slate-700">
                    <Link to="/" className="text-white hover:text-slate-300">
                        QLNS
                    </Link>
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    defaultOpenKeys={getDefaultOpenKeys()}
                    className="h-full border-r-0"
                    items={menuItems}
                />
            </aside>

            <div className="flex flex-col flex-1 ml-60">
                <header className="flex justify-between items-center p-4 border-b shadow-sm bg-white sticky top-0 z-10">
                    <div className="w-64">
                        <Input
                            placeholder="Tìm kiếm..."
                            className="rounded-full px-4 py-1 border border-slate-300 text-sm"
                            allowClear
                            disabled={!user}
                        />
                    </div>
                    <div className="flex flex-wrap items-center space-x-4">
                        {user ? (
                            <>
                                <Link to="/thongbao" className="relative cursor-pointer">
                                    <Badge count={unreadNotificationsCount} offset={[5, 0]}>
                                        <Bell className="text-slate-600 w-5 h-5" />
                                    </Badge>
                                </Link>
                                <Link to="/quanlytaikhoan" className="flex items-center space-x-2 cursor-pointer">
                                    <Avatar size={32} icon={<User />} />
                                    <div className="text-sm text-slate-700">
                                        <div>{user.name}</div>
                                        <div className="text-xs text-slate-500">{user.role}</div>
                                    </div>
                                </Link>
                                {/* Nút Đăng xuất đã được loại bỏ khỏi navbar */}
                            </>
                        ) : (
                            <>
                                <Link to="/login">
                                    <Button
                                        type="primary"
                                        icon={<LogIn size={18} />}
                                        className="bg-blue-600 hover:bg-blue-700 rounded-lg"
                                    >
                                        Đăng nhập
                                    </Button>
                                </Link>
                                <Link to="/register">
                                    <Button
                                        type="default"
                                        icon={<UserPlus size={18} />}
                                        className="rounded-lg border-blue-600 text-blue-600 hover:text-blue-700 hover:border-blue-700"
                                    >
                                        Đăng ký
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default SBNV;
