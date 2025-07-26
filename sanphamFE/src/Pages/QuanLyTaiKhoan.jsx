// src/Pages/QuanLyTaiKhoan.jsx
import React, { useState, useEffect } from 'react';
import { Avatar, Input, Button, message, Tag, Space } from 'antd';
import { User, Mail, Edit, Save, Plus, XCircle, Bell } from 'lucide-react';
import { useAuth } from '../Context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const QuanLyTaiKhoan = () => {
    const { user, loading, updateUser } = useAuth();
    const navigate = useNavigate();

    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState('');
    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [avatar, setAvatar] = useState(''); // State này vẫn giữ để dùng cho avatar chính giữa trang
    const [bio, setBio] = useState('');
    const [introduction, setIntroduction] = useState('');
    const [skills, setSkills] = useState([]);
    const [newSkill, setNewSkill] = useState('');

    useEffect(() => {
        if (user) {
            setName(user.name);
            setNickname(user.nickname || '');
            setEmail(user.email);
            setAvatar(user.avatar || 'https://via.placeholder.com/150'); // Giữ avatar cho ảnh đại diện chính giữa trang
            setBio(user.bio || '');
            setIntroduction(user.introduction || '');
            setSkills(user.skills || []);
        }
    }, [user]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen text-xl text-slate-700">
                Đang tải...
            </div>
        );
    }

    if (!user) {
        navigate('/login');
        return null;
    }

    const handleAddSkill = () => {
        if (newSkill.trim() && !skills.includes(newSkill.trim())) {
            setSkills([...skills, newSkill.trim()]);
            setNewSkill('');
        }
    };

    const handleRemoveSkill = (skillToRemove) => {
        setSkills(skills.filter(skill => skill !== skillToRemove));
    };

    const handleSave = async () => {
        const updatedData = {
            nickname,
            avatar, 
            bio,
            introduction,
            skills,
        };

        const result = await updateUser(updatedData);

        if (result.success) {
            message.success('Cập nhật thông tin thành công!');
            setIsEditing(false);
        } else {
            message.error(result.message || 'Cập nhật thông tin thất bại.');
        }
    };

    const handleCancelEdit = () => {
        if (user) {
            setNickname(user.nickname || '');
            setAvatar(user.avatar || 'https://via.placeholder.com/150');
            setBio(user.bio || '');
            setIntroduction(user.introduction || '');
            setSkills(user.skills || []);
        }
        setIsEditing(false);
    };

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <aside className="w-60 bg-gradient-to-b from-slate-800 to-slate-900 text-white fixed h-full shadow-xl z-10">
                <div className="p-6 text-2xl font-bold border-b border-slate-700">
                    <Link to="/" className="text-white hover:text-slate-300">QLNS</Link>
                </div>
                <nav className="p-4 space-y-4">
                    <div className="hover:text-slate-300 cursor-pointer">Dashboard</div>
                    {user && user.role === 'admin' && (
                        <>
                             <Link to="/quanlynhanvien" className="block hover:text-slate-300 cursor-pointer">
                                Quản lý nhân viên
                            </Link>
                        </>
                    )}
                    <div className="hover:text-slate-300 cursor-pointer">Chấm công</div>
                    <div className="hover:text-slate-300 cursor-pointer">Lương & Thưởng</div>
                    <div className="hover:text-slate-300 cursor-pointer">Báo cáo</div>
                    <Link to="/caidat" className="block hover:text-slate-300 cursor-pointer">Cài đặt</Link>
                </nav>
            </aside>

            {/* Nội dung chính */}
            <div className="flex flex-col flex-1 ml-60">
                <header className="flex justify-between items-center p-4 border-b shadow-sm bg-white sticky top-0 z-10">
                    <div className="w-64">
                        <Input
                            placeholder="Tìm kiếm..."
                            className="rounded-full px-4 py-1 border border-slate-300 text-sm"
                            allowClear
                        />
                    </div>
                    <div className="flex flex-wrap items-center space-x-4">
                        <Bell className="text-slate-600 w-5 h-5" />
                        <Link to="/quanlytaikhoan" className="flex items-center space-x-2 cursor-pointer">
                            <Avatar size={32} icon={<User />} />
                            <div className="text-sm text-slate-700">
                                <div>{user.name}</div>
                                <div className="text-xs text-slate-500">{user.role}</div>
                            </div>
                        </Link>
                    </div>
                </header>

                <main className="flex-1 p-8 bg-gradient-to-br from-slate-50 to-slate-200 overflow-y-auto">
                    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-xl">
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <h2 className="text-3xl font-bold text-gray-800">Thông tin tài khoản</h2>
                            {!isEditing ? (
                                <Button
                                    type="primary"
                                    icon={<Edit size={18} />}
                                    onClick={() => setIsEditing(true)}
                                    className="bg-blue-600 hover:bg-blue-700 rounded-lg"
                                >
                                    Chỉnh sửa
                                </Button>
                            ) : (
                                <Space>
                                    <Button
                                        type="default"
                                        icon={<XCircle size={18} />}
                                        onClick={handleCancelEdit}
                                        className="rounded-lg text-red-600 border-red-600 hover:text-red-700 hover:border-red-700"
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        type="primary"
                                        icon={<Save size={18} />}
                                        onClick={handleSave}
                                        className="bg-green-600 hover:bg-green-700 rounded-lg"
                                    >
                                        Lưu thay đổi
                                    </Button>
                                </Space>
                            )}
                        </div>

                        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                            <div className="flex flex-col items-center">
                                <Avatar size={120} src={avatar} icon={<User />} className="mb-4 shadow-md" />
                            </div>

                            <div className="flex-1 w-full">
                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2">Tên:</label>
                                    <Input
                                        size="large"
                                        value={name}
                                        prefix={<User size={18} className="text-gray-400" />}
                                        className="rounded-lg"
                                        disabled
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2">Biệt danh:</label>
                                    {isEditing ? (
                                        <Input
                                            size="large"
                                            value={nickname}
                                            onChange={(e) => setNickname(e.target.value)}
                                            placeholder="Nhập biệt danh của bạn"
                                            className="rounded-lg"
                                        />
                                    ) : (
                                        <p className="text-gray-900 text-lg p-2 bg-gray-50 rounded-lg">{nickname || "Chưa có biệt danh."}</p>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2">Email:</label>
                                    <Input
                                        size="large"
                                        value={email}
                                        prefix={<Mail size={18} className="text-gray-400" />}
                                        className="rounded-lg"
                                        disabled
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2">Tiểu sử:</label>
                                    {isEditing ? (
                                        <Input.TextArea
                                            rows={3}
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            placeholder="Một vài dòng về bản thân..."
                                            className="rounded-lg"
                                        />
                                    ) : (
                                        <p className="text-gray-900 text-lg p-2 bg-gray-50 rounded-lg whitespace-pre-wrap">{bio || "Chưa có tiểu sử."}</p>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2">Giới thiệu:</label>
                                    {isEditing ? (
                                        <Input.TextArea
                                            rows={4}
                                            value={introduction}
                                            onChange={(e) => setIntroduction(e.target.value)}
                                            placeholder="Giới thiệu chi tiết về bạn..."
                                            className="rounded-lg"
                                        />
                                    ) : (
                                        <p className="text-gray-900 text-lg p-2 bg-gray-50 rounded-lg whitespace-pre-wrap">{introduction || "Chưa có giới thiệu."}</p>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2">Kỹ năng:</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {skills.map((skill, index) => (
                                            <Tag
                                                key={index}
                                                color="blue"
                                                closable={isEditing}
                                                onClose={() => handleRemoveSkill(skill)}
                                                className="py-1 px-3 text-base rounded-full"
                                            >
                                                {skill}
                                            </Tag>
                                        ))}
                                    </div>
                                    {isEditing && (
                                        <Space.Compact style={{ width: '100%' }}>
                                            <Input
                                                value={newSkill}
                                                onChange={(e) => setNewSkill(e.target.value)}
                                                placeholder="Thêm kỹ năng mới"
                                                onPressEnter={handleAddSkill}
                                                className="rounded-lg"
                                            />
                                            <Button
                                                type="primary"
                                                icon={<Plus size={18} />}
                                                onClick={handleAddSkill}
                                                className="rounded-lg bg-blue-500 hover:bg-blue-600"
                                            >
                                                Thêm
                                            </Button>
                                        </Space.Compact>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default QuanLyTaiKhoan;