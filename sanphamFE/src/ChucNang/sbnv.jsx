// frontend/src/ChucNang/sbnv.jsx
import React, { useState } from "react";
import { Avatar, Input, Button, Spin, Menu } from "antd";
import { Bell, LogIn, UserPlus, User, LogOut, Clock, Users, DollarSign, BarChart, FileText, List } from "lucide-react";
import { SettingOutlined } from '@ant-design/icons';
import { useAuth } from '../Context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';

const SBNV = ({ children }) => {
    const { user, logout, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Hàm handleLogout không thay đổi, chỉ là nút gọi nó bị xóa khỏi navbar
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen text-xl text-slate-700">
                <Spin size="large" tip="Đang tải..." />
            </div>
        );
    }

    // Định nghĩa các mục menu sử dụng cấu trúc 'items' của Ant Design
    const menuItems = user ? [ // Chỉ render menuItems nếu user đã đăng nhập
        {
            key: '/',
            icon: <Bell className="w-5 h-5 mr-2" />,
            label: <Link to="/">Dashboard</Link>,
        },
        // Mục Chấm công
        user.role === 'admin' ? {
            key: 'sub-chamcong', // Key riêng cho submenu chấm công
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
        // Mục Quản lý nhân viên (chỉ Admin)
        user.role === 'admin' && {
            key: '/quanlynhanvien',
            icon: <Users className="w-5 h-5 mr-2" />,
            label: <Link to="/quanlynhanvien">Quản lý nhân viên</Link>,
        },
        // Mục Nghỉ phép / Khiếu nại (có submenu cho cả User và Admin)
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
                // Các mục quản lý chỉ dành cho Admin
                user.role === 'admin' && {
                    key: '/quanlyxinnghi',
                    label: <Link to="/quanlyxinnghi">Quản lý yêu cầu nghỉ phép</Link>,
                },
                user.role === 'admin' && {
                    key: '/quanlykhieunai',
                    label: <Link to="/quanlykhieunai">Quản lý khiếu nại</Link>,
                },
            ].filter(Boolean), // Lọc bỏ các mục null/undefined nếu user.role không phù hợp
        },
        // Mục Lương & Thưởng
        {
            key: '/luongthuong',
            icon: <DollarSign className="w-5 h-5 mr-2" />,
            label: 'Lương & Thưởng',
            disabled: true,
        },
        // Mục Báo cáo
        {
            key: '/baocao',
            icon: <BarChart className="w-5 h-5 mr-2" />,
            label: 'Báo cáo',
            disabled: true,
        },
        // Mục Cài đặt
        {
            key: '/caidat',
            icon: <SettingOutlined className="w-5 h-5 mr-2" />,
            label: <Link to="/caidat">Cài đặt</Link>,
        },
    ].filter(Boolean) : []; // Nếu user không tồn tại, menuItems là mảng rỗng

    // Xác định defaultOpenKeys dựa trên location.pathname để submenu mở đúng khi tải trang
    const getDefaultOpenKeys = () => {
        if (!user) return []; // Nếu chưa đăng nhập, không mở submenu nào

        if (location.pathname.startsWith('/chamcong') || location.pathname.startsWith('/quanlychamcong')) {
            return ['sub-chamcong'];
        }
        if (location.pathname.startsWith('/xinnghi') || location.pathname.startsWith('/khieunai') ||
            location.pathname.startsWith('/quanlyxinnghi') || location.pathname.startsWith('/quanlykhieunai')) {
            return ['sub-leave-complaint'];
        }
        return [];
    };

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <aside className="w-60 bg-gradient-to-b from-slate-800 to-slate-900 text-white fixed h-full shadow-xl z-10">
                <div className="p-6 text-2xl font-bold border-b border-slate-700">
                    <Link to="/" className="text-white hover:text-slate-300">
                        QLNS
                    </Link>
                </div>
                {/* Sử dụng Ant Design Menu component với prop 'items' */}
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    defaultOpenKeys={getDefaultOpenKeys()} // Sử dụng hàm để xác định defaultOpenKeys
                    className="h-full border-r-0"
                    items={menuItems} // Truyền mảng items vào đây
                />
            </aside>

            {/* Nội dung chính và Navbar */}
            <div className="flex flex-col flex-1 ml-60">
                {/* Navbar */}
                <header className="flex justify-between items-center p-4 border-b shadow-sm bg-white sticky top-0 z-10">
                    <div className="w-64">
                        <Input
                            placeholder="Tìm kiếm..."
                            className="rounded-full px-4 py-1 border border-slate-300 text-sm"
                            allowClear
                            disabled={!user} // Vô hiệu hóa ô tìm kiếm nếu chưa đăng nhập
                        />
                    </div>
                    <div className="flex flex-wrap items-center space-x-4">
                        {user ? (
                            <>
                                <Bell className="text-slate-600 w-5 h-5" /> {/* Chỉ hiện chuông khi đã đăng nhập */}
                                <Link to="/quanlytaikhoan" className="flex items-center space-x-2 cursor-pointer">
                                    <Avatar size={32} icon={<User />} />
                                    <div className="text-sm text-slate-700">
                                        <div>{user.name}</div>
                                        <div className="text-xs text-slate-500">{user.role}</div>
                                    </div>
                                </Link>
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
                {/* Thêm overflow-y-auto để cho phép cuộn nội dung chính */}
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default SBNV;
