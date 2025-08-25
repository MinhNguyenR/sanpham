import React, { useState, useEffect, useCallback } from "react";
import { Avatar, Input, Button, Spin, Menu, Badge, message } from "antd";
import {
    Bell, LogIn, UserPlus, User, Clock, Users, DollarSign, BarChart,
    FileText, List, Send,
    CalendarPlus,
    Flag,
    ClipboardList,
    MessageSquareWarning,
    BookOpen, 
    GraduationCap, 
    CheckSquare, 
    Award, 
    Briefcase, 
    UserRoundPlus, 
    Settings, 
    FileText as ContractIcon,
} from "lucide-react";
import { SettingOutlined } from '@ant-design/icons';
import { useAuth } from '../Context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import logo from '../assets/logo.png'; 

const API_URL = 'http://localhost:5000/api/auth';
const SOCKET_URL = 'http://localhost:5000';

let socket;

const SBNV = ({ children }) => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);


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
                message.info('Bạn có thông báo mới!');
                fetchUnreadNotificationsCount(); 
            });

            socket.on('disconnect', () => {
                console.log('Socket.IO đã ngắt kết nối từ SBNV');
            });

            socket.on('connect_error', (err) => {
                console.error('Lỗi kết nối Socket.IO từ SBNV:', err.message);
            });
        } else {
            socket.emit('joinRoom', user._id);
        }

        return () => {
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
            icon: <Bell className="w-5 h-5 mr-2 text-white group-hover:text-blue-500 transition-colors" />,
            label: <Link to="/">Dashboard</Link>,
        },
        user.role === 'admin' ? {
            key: 'sub-chamcong',
            icon: <Clock className="w-5 h-5 mr-2 text-white group-hover:text-blue-500 transition-colors" />,
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
            icon: <Clock className="w-5 h-5 mr-2 text-white group-hover:text-blue-500 transition-colors" />,
            label: <Link to="/chamcong">Chấm công</Link>,
        },
        user.role === 'admin' && {
            key: '/quanlynhanvien',
            icon: <Users className="w-5 h-5 mr-2 text-white group-hover:text-blue-500 transition-colors" />,
            label: <Link to="/quanlynhanvien">Quản lý nhân viên</Link>,
        },
        {
            key: 'sub-leave-complaint',
            icon: <FileText className="w-5 h-5 mr-2 text-white group-hover:text-blue-500 transition-colors" />,
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

        {
            key: 'sub-training-courses',
            icon: <GraduationCap className="w-5 h-5 mr-2 text-white group-hover:text-blue-500 transition-colors" />, 
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

        user.role === 'admin' ? {
            key: 'sub-evaluation',
            icon: <CheckSquare className="w-5 h-5 mr-2 text-white group-hover:text-blue-500 transition-colors" />,
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
            icon: <CheckSquare className="w-5 h-5 mr-2 text-white group-hover:text-blue-500 transition-colors" />,
            label: <Link to="/danhgia">Đánh giá</Link>,
        },
        user.role === 'admin' && {
            key: '/guithongbao',
            icon: <Send className="w-5 h-5 mr-2 text-white group-hover:text-blue-500 transition-colors" />,
            label: <Link to="/guithongbao">Gửi thông báo</Link>,
        },
        {
            key: 'sub-salary-bonus', 
            icon: <DollarSign className="w-5 h-5 mr-2 text-white group-hover:text-blue-500 transition-colors" />,
            label: 'Lương & Thưởng',
            children: [
                {
                    key: '/luongthuong',
                    label: <Link to="/luongthuong">Lương Thưởng cá nhân</Link>,
                },
                user.role === 'admin' && { 
                    key: '/quanlyluongthuong',
                    label: <Link to="/quanlyluongthuong">Quản lý Lương Thưởng</Link>,
                },
            ].filter(Boolean),
        },
        {
            key: 'sub-benefit-policies',
            icon: <Award className="w-5 h-5 mr-2 text-white group-hover:text-blue-500 transition-colors" />,
            label: 'Phúc lợi',
            children: [
                {
                    key: '/phucloi',
                    label: <Link to="/phucloi">Chính sách Phúc lợi cá nhân</Link>, 
                },
                user.role === 'admin' && { 
                    key: '/quanlyphucloi',
                    label: <Link to="/quanlyphucloi">Quản lý Chính sách Phúc lợi</Link>,
                },
            ].filter(Boolean),
        },
        
        {
            key: 'sub-recruitment-promotion',
            icon: <Briefcase className="w-5 h-5 mr-2 text-white group-hover:text-blue-500 transition-colors" />,
            label: 'Tuyển dụng & Thăng tiến',
            children: [
                {
                    key: '/tuyendung',
                    label: <Link to="/tuyendung">Vị trí Tuyển dụng</Link>, 
                },
                {
                    key: '/donungtuyencuatoi',
                    label: <Link to="/donungtuyencuatoi">Đơn ứng tuyển của tôi</Link>, 
                },
                user.role === 'admin' && { 
                    key: '/quanlytuyendung',
                    label: <Link to="/quanlytuyendung">Quản lý Tuyển dụng</Link>,
                },
            ].filter(Boolean),
        },

        user.role === 'admin' && {
            key: '/quanlycauhinh',
            icon: <Settings className="w-5 h-5 mr-2 text-white group-hover:text-blue-500 transition-colors" />,
            label: <Link to="/quanlycauhinh">Cấu hình Hệ thống</Link>,
        },
        {
            key: 'sub-contracts',
            icon: <ContractIcon className="w-5 h-5 mr-2 text-white group-hover:text-blue-500 transition-colors" />,
            label: 'Hợp đồng',
            children: [
                user.role === 'admin' && {
                    key: '/quanlyhopdong',
                    label: <Link to="/quanlyhopdong">Quản lý Hợp đồng</Link>,
                },
                {
                    key: '/hopdongcuatoi',
                    label: <Link to="/hopdongcuatoi">Hợp đồng của tôi</Link>,
                },
                user.role === 'admin' && { 
                    key: '/hopdongsaphethan',
                    label: <Link to="/hopdongsaphethan">Hợp đồng sắp hết hạn</Link>,
                },
            ].filter(Boolean),
        },
        {
            key: '/caidat',
            icon: <SettingOutlined className="w-5 h-5 mr-2 text-white group-hover:text-blue-500 transition-colors" />,
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
        if (location.pathname.startsWith('/luongthuong') || location.pathname.startsWith('/quanlyluongthuong')) {
            return ['sub-salary-bonus'];
        }
        if (location.pathname.startsWith('/phucloi') || location.pathname.startsWith('/quanlyphucloi')) {
            return ['sub-benefit-policies'];
        }
        if (location.pathname.startsWith('/tuyendung') || location.pathname.startsWith('/donungtuyencuatoi') || location.pathname.startsWith('/quanlytuyendung')) {
            return ['sub-recruitment-promotion'];
        }
        if (location.pathname.startsWith('/quanlycauhinh')) {
            return ['/quanlycauhinh'];
        }
        if (location.pathname.startsWith('/quanlyhopdong') || location.pathname.startsWith('/hopdongcuatoi') || location.pathname.startsWith('/hopdongsaphethan')) {
            return ['sub-contracts'];
        }
        return [];
    };

    return (
        <div className="flex h-screen overflow-hidden font-sans bg-gray-100">
            <aside className="w-64 bg-slate-900 text-white fixed h-full shadow-lg z-20 overflow-y-auto transform -translate-x-full md:translate-x-0 transition-transform duration-300">
                <div className="p-6 flex items-center justify-center border-b border-slate-700">
                    <Link to="/" className="text-white hover:text-blue-400 flex items-center transition-colors">
                        <img src={logo} alt="Logo" className="w-8 h-8 mr-2" />
                        <span className="text-xl font-bold tracking-wide">HRMS</span>
                    </Link>
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    defaultOpenKeys={getDefaultOpenKeys()}
                    className="h-full border-r-0 font-medium"
                    items={menuItems}
                    style={{ backgroundColor: '#0A192F' }}
                />
            </aside>

            <div className="flex flex-col flex-1 ml-0 md:ml-64">
                <header className="flex justify-between items-center p-4 border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
                    <div className="flex-1 max-w-sm">
                        <Input
                            placeholder="Tìm kiếm..."
                            className="rounded-lg px-4 py-2 text-sm focus:border-blue-500"
                            allowClear
                            disabled={!user}
                        />
                    </div>
                    <div className="flex items-center space-x-4">
                        {user ? (
                            <>
                                <Link to="/thongbao" className="relative p-2 rounded-full hover:bg-gray-200 transition-colors">
                                    <Badge count={unreadNotificationsCount} offset={[0, 0]}>
                                        <Bell className="text-gray-600 w-5 h-5" />
                                    </Badge>
                                </Link>
                                <Link to="/quanlytaikhoan" className="flex items-center space-x-3 cursor-pointer p-1 rounded-full hover:bg-gray-200 transition-colors">
                                    <Avatar size={36} icon={<User />} className="bg-blue-500 text-white" />
                                    <div className="text-sm font-medium text-gray-800">
                                        <div>{user.name}</div>
                                        <div className="text-xs text-gray-500">{user.role}</div>
                                        {user.position && ( 
                                            <div className="text-xs text-gray-500">{user.position}</div>
                                        )}
                                    </div>
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link to="/login">
                                    <Button
                                        type="primary"
                                        icon={<LogIn size={18} />}
                                        className="bg-blue-600 hover:!bg-blue-700 rounded-lg border-none"
                                    >
                                        Đăng nhập
                                    </Button>
                                </Link>
                                <Link to="/register">
                                    <Button
                                        type="default"
                                        icon={<UserPlus size={18} />}
                                        className="rounded-lg border-blue-600 text-blue-600 hover:!text-blue-700 hover:!border-blue-700"
                                    >
                                        Đăng ký
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default SBNV;