import React, { useState, useEffect } from 'react';
import { Avatar, Input, Button, message, Tag, Space, Spin } from 'antd';
import { User, Mail, Edit, Save, Plus, XCircle, Bell } from 'lucide-react';
import { useAuth } from '../Context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import SBNV from '../ChucNang/sbnv';

const QuanLyTaiKhoan = () => {
    const { user, loading, updateUser } = useAuth();
    const navigate = useNavigate();

    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState('');
    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [avatar, setAvatar] = useState('');
    const [bio, setBio] = useState('');
    const [introduction, setIntroduction] = useState('');
    const [skills, setSkills] = useState([]);
    const [position, setPosition] = useState('');
    const [newSkill, setNewSkill] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name);
            setNickname(user.nickname || '');
            setEmail(user.email);
            setAvatar(user.avatar || 'https://via.placeholder.com/150');
            setBio(user.bio || '');
            setIntroduction(user.introduction || '');
            setSkills(user.skills || []);
            setPosition(user.position || '');
        }
    }, [user]);

    if (loading) {
        return (
            <SBNV>
                <div className="flex items-center justify-center min-h-screen bg-gray-100">
                    <Spin size="large" tip="Đang tải..." />
                </div>
            </SBNV>
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
        setIsSaving(true);
        const updatedData = {
            nickname,
            avatar,
            bio,
            introduction,
            skills,
            position,
        };

        const result = await updateUser(updatedData);

        if (result.success) {
            message.success('Cập nhật thông tin thành công!');
            setIsEditing(false);
        } else {
            message.error(result.message || 'Cập nhật thông tin thất bại.');
        }
        setIsSaving(false);
    };

    const handleCancelEdit = () => {
        if (user) {
            setNickname(user.nickname || '');
            setAvatar(user.avatar || 'https://via.placeholder.com/150');
            setBio(user.bio || '');
            setIntroduction(user.introduction || '');
            setSkills(user.skills || []);
            setPosition(user.position || '');
        }
        setIsEditing(false);
    };

    return (
        <SBNV>
            <div className="flex flex-col items-center flex-1 bg-gradient-to-br from-slate-50 to-slate-200 p-8 min-h-screen overflow-y-auto">
                <div className="text-center mb-12">
                    <h1 className="text-6xl font-extrabold text-blue-700 drop-shadow-[0_6px_6px_rgba(0,0,0,0.2)] mb-4 animate-fadeIn">
                        Thông Tin Cá Nhân
                    </h1>
                    <p className="text-xl text-gray-700 font-medium">
                        Quản lý hồ sơ của bạn một cách dễ dàng.
                    </p>
                </div>
                <div className="w-full max-w-4xl bg-white p-8 rounded-2xl shadow-2xl">
                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                        <h2 className="text-3xl font-bold text-gray-800">Chi tiết tài khoản</h2>
                        {!isEditing ? (
                            <Button
                                type="primary"
                                icon={<Edit size={18} />}
                                onClick={() => setIsEditing(true)}
                                className="bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg transform transition duration-300 hover:scale-105"
                            >
                                Chỉnh sửa
                            </Button>
                        ) : (
                            <Space>
                                <Button
                                    type="default"
                                    icon={<XCircle size={18} />}
                                    onClick={handleCancelEdit}
                                    className="rounded-lg text-red-600 border-red-600 hover:text-red-700 hover:border-red-700 transform transition duration-300 hover:scale-105"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<Save size={18} />}
                                    onClick={handleSave}
                                    loading={isSaving}
                                    className="bg-green-600 hover:bg-green-700 rounded-lg shadow-lg transform transition duration-300 hover:scale-105"
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
                                    className="rounded-lg bg-gray-100"
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
                                    className="rounded-lg bg-gray-100"
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
                                <label className="block text-gray-700 text-sm font-bold mb-2">Chức vụ:</label>
                                <Input
                                    size="large"
                                    value={user.position || ''}
                                    prefix={<User size={18} className="text-gray-400" />}
                                    className="rounded-lg bg-gray-100"
                                    disabled
                                />
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
                                            className="py-1 px-3 text-base rounded-full shadow-sm"
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
            </div>
        </SBNV>
    );
};

export default QuanLyTaiKhoan;
