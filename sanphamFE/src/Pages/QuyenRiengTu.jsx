import React, { useState, useEffect } from 'react';
import { Button, Form, message, Modal, Input, Avatar, Spin } from 'antd';
import { User, Mail, Edit, Save, Key, Clock, Trash2, X, LogOut } from 'lucide-react';
import { useAuth } from '../Context/AuthContext';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import SBNV from '../ChucNang/sbnv';

const pageAnimation = `
    @keyframes fadeInScale {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
    }
    .animate-fadeInScale {
        animation: fadeInScale 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    }
`;

const QuyenRiengTu = () => {
    const { user, loading, updateUser, logout, deleteAccount } = useAuth();
    const navigate = useNavigate();
    const [form] = Form.useForm();

    const [isEditing, setIsEditing] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmDeleteText, setConfirmDeleteText] = useState('');
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

    useEffect(() => {
        if (user) {
            form.setFieldsValue({
                name: user.name || '',
                email: user.email || '',
            });
        }
    }, [user, form]);

    if (loading) {
        return (
            <SBNV>
                <div className="flex items-center justify-center h-screen bg-slate-100">
                    <Spin size="large" tip="Đang tải..." />
                </div>
            </SBNV>
        );
    }

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            let updatedData = { name: values.name };

            if (newPassword) {
                const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{6,})/;
                if (!passwordRegex.test(newPassword)) {
                    message.error('Mật khẩu phải có ít nhất 6 ký tự, bao gồm ít nhất một số và một ký tự đặc biệt.');
                    return;
                }
                updatedData.password = newPassword;
            }

            const res = await updateUser(updatedData);

            if (res.success) {
                message.success('Cập nhật thông tin thành công!');
                setIsEditing(false);
                setNewPassword('');
            } else {
                message.error(res.message || 'Cập nhật thông tin thất bại.');
            }
        } catch (errorInfo) {
            console.error('Failed:', errorInfo);
            message.error('Vui lòng điền đầy đủ và đúng thông tin.');
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        if (user) {
            form.setFieldsValue({
                name: user.name || '',
                email: user.email || '',
            });
        }
        setNewPassword('');
    };

    const handleDeleteAccount = async () => {
        if (confirmDeleteText === 'delete') {
            const res = await deleteAccount();
            if (res.success) {
                message.success(res.message);
                setIsDeleteModalVisible(false);
                setConfirmDeleteText('');
            } else {
                message.error(res.message || 'Xóa tài khoản thất bại.');
            }
        } else {
            message.error('Vui lòng gõ chính xác "delete" để xác nhận.');
        }
    };

    const handleLogoutClick = () => {
        logout();
        navigate('/login');
    };

    return (
        <SBNV>
            <style>{pageAnimation}</style>
            <div className="flex flex-col items-center flex-1 bg-gradient-to-br from-indigo-100 to-sky-100 p-8">
                <h2 className="text-4xl font-bold text-blue-700 mb-8 drop-shadow-[0_4px_4px_rgba(0,0,0,0.1)]">
                    Cài đặt quyền riêng tư
                </h2>
                
                {/* Thẻ chính với hiệu ứng và animation */}
                <div className="animate-fadeInScale bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg space-y-6 transform transition-all duration-300 hover:shadow-2xl">
                    <div className="flex justify-center mb-6">
                        <Avatar
                            size={{ xs: 64, sm: 80, md: 96, lg: 128, xl: 160, xxl: 180 }}
                            className="bg-blue-500 shadow-md ring-4 ring-blue-300 ring-offset-2"
                        >
                            <span className="text-6xl text-white font-bold">{user?.name?.charAt(0) || 'U'}</span>
                        </Avatar>
                    </div>

                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSave}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-2xl font-bold text-blue-600">Thông tin cá nhân</h3>
                            {isEditing ? (
                                <div className="flex space-x-2">
                                    <Button
                                        type="default"
                                        icon={<X size={18} />}
                                        onClick={handleCancelEdit}
                                        className="rounded-lg border-slate-300 text-slate-600 transition-colors duration-200 hover:text-red-500 hover:border-red-400"
                                    >
                                        Hủy bỏ
                                    </Button>
                                    <Button
                                        type="primary"
                                        icon={<Save size={18} />}
                                        onClick={() => form.submit()}
                                        className="bg-blue-500 hover:bg-blue-600 rounded-lg transition-all duration-200 hover:shadow-md hover:scale-105"
                                    >
                                        Lưu thay đổi
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    type="default"
                                    icon={<Edit size={18} />}
                                    onClick={() => setIsEditing(true)}
                                    className="rounded-lg border-blue-500 text-blue-700 transition-colors duration-200 hover:text-blue-800 hover:border-blue-600 hover:shadow-md"
                                >
                                    Chỉnh sửa
                                </Button>
                            )}
                        </div>

                        <Form.Item label={<span className="font-semibold"><Clock size={16} className="inline mr-2" />Thời gian tạo tài khoản</span>}>
                            <Input
                                value={user.createdAt ? moment(user.createdAt).format('DD/MM/YYYY HH:mm') : 'N/A'}
                                readOnly
                                className="!rounded-lg border-slate-300 !bg-slate-50"
                            />
                        </Form.Item>

                        <Form.Item
                            label={<span className="font-semibold"><User size={16} className="inline mr-2" />Tên tài khoản</span>}
                            name="name"
                            rules={[{ required: true, message: 'Vui lòng nhập tên tài khoản!' }]}
                        >
                            <Input
                                readOnly={!isEditing}
                                className={`!rounded-lg ${isEditing ? 'border-blue-400' : 'border-slate-300 !bg-slate-50'}`}
                            />
                        </Form.Item>

                        <Form.Item label={<span className="font-semibold"><Mail size={16} className="inline mr-2" />Email</span>}>
                            <Input
                                value={user.email || ''}
                                readOnly
                                className="!rounded-lg border-slate-300 !bg-slate-50"
                            />
                        </Form.Item>

                        <Form.Item label={<span className="font-semibold"><User size={16} className="inline mr-2" />Role</span>}>
                            <Input
                                value={user.role || 'N/A'}
                                readOnly
                                className="!rounded-lg border-slate-300 !bg-slate-50"
                            />
                        </Form.Item>
                        <Form.Item label={<span className="font-semibold"><User size={16} className="inline mr-2" />Chức vụ</span>}>
                            <Input
                                value={user.position || 'N/A'}
                                readOnly
                                className="!rounded-lg border-slate-300 !bg-slate-50"
                            />
                        </Form.Item>
                        <Form.Item
                            label={<span className="font-semibold"><Key size={16} className="inline mr-2" />Mật khẩu</span>}
                            name="password"
                            help="Để trống nếu không muốn thay đổi mật khẩu"
                        >
                            <Input.Password
                                placeholder={isEditing ? "Nhập mật khẩu mới" : "********"}
                                readOnly={!isEditing}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className={`!rounded-lg ${isEditing ? 'border-blue-400' : 'border-slate-300 !bg-slate-50'}`}
                            />
                        </Form.Item>
                    </Form>

                    <div className="mt-6 pt-6 border-t border-slate-200">
                        <Button
                            type="default"
                            icon={<LogOut size={18} />}
                            onClick={handleLogoutClick}
                            className="w-full text-slate-700 border-slate-300 rounded-lg transition-all duration-200 hover:text-blue-700 hover:border-blue-500 hover:scale-[1.01]"
                            size="large"
                        >
                            Đăng xuất khỏi tài khoản
                        </Button>
                    </div>

                    <div className="border-t border-slate-200 pt-6 mt-6">
                        <h3 className="text-2xl font-bold text-red-700 mb-4">Xóa tài khoản</h3>
                        <Button
                            type="primary"
                            danger
                            icon={<Trash2 size={18} />}
                            onClick={() => setIsDeleteModalVisible(true)}
                            className="w-full bg-red-500 hover:bg-red-600 rounded-lg transition-all duration-200 hover:shadow-md hover:scale-[1.01]"
                            size="large"
                        >
                            Xóa tài khoản
                        </Button>
                    </div>
                </div>
            </div>

            {/* Modal xác nhận xóa tài khoản */}
            <Modal
                title="Xác nhận xóa tài khoản"
                open={isDeleteModalVisible}
                onCancel={() => setIsDeleteModalVisible(false)}
                footer={[
                    <Button key="back" onClick={() => setIsDeleteModalVisible(false)}>
                        Hủy
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        danger
                        onClick={handleDeleteAccount}
                        disabled={confirmDeleteText !== 'delete'}
                    >
                        Tôi hiểu, xóa tài khoản
                    </Button>,
                ]}
            >
                <p className="text-gray-700">Bạn có chắc chắn muốn xóa tài khoản của mình không? Hành động này không thể hoàn tác.</p>
                <p className="mt-2 text-gray-700">Để xác nhận, vui lòng gõ "<span className="font-bold text-red-500">delete</span>" vào ô bên dưới:</p>
                <Input
                    value={confirmDeleteText}
                    onChange={(e) => setConfirmDeleteText(e.target.value)}
                    placeholder="Gõ 'delete' để xác nhận"
                    className="mt-4 rounded-lg"
                />
            </Modal>
        </SBNV>
    );
};

export default QuyenRiengTu;
