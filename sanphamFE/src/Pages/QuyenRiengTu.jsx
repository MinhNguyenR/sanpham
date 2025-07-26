// src/Pages/QuyenRiengTu.jsx
import React, { useState, useEffect } from 'react';
import { Button, Form, message, Modal, Input, Avatar, Spin } from 'antd'; // Thêm Spin
import { User, Mail, Edit, Save, Key, Clock, Trash2, X, LogOut } from 'lucide-react'; // Thêm LogOut cho nút Đăng xuất
import { useAuth } from '../Context/AuthContext';
import { useNavigate } from 'react-router-dom'; // Chỉ cần useNavigate
import moment from 'moment'; // Import moment for date formatting
import SBNV from '../ChucNang/sbnv'; // Import SBNV

const QuyenRiengTu = () => {
    const { user, loading, updateUser, logout, deleteAccount } = useAuth();
    const navigate = useNavigate();
    const [form] = Form.useForm();

    const [isEditing, setIsEditing] = useState(false);
    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmDeleteText, setConfirmDeleteText] = useState('');
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

    useEffect(() => {
        if (user) {
            setUserName(user.name || '');
            setUserEmail(user.email || '');
            form.setFieldsValue({
                name: user.name || '',
                email: user.email || '',
            });
        }
    }, [user, form]);

    if (loading) {
        return (
            // SBNV đã xử lý màn hình loading toàn cục,
            // nhưng nếu bạn muốn một loading spinner riêng cho nội dung này, có thể giữ lại
            <SBNV>
                <div className="flex items-center justify-center h-full">
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
            const res = await deleteAccount(); // Gọi hàm deleteAccount từ AuthContext
            if (res.success) {
                message.success(res.message);
                setIsDeleteModalVisible(false);
                setConfirmDeleteText('');
                // Logout và chuyển hướng đã được xử lý trong deleteAccount của AuthContext
            } else {
                message.error(res.message || 'Xóa tài khoản thất bại.');
            }
        } else {
            message.error('Vui lòng gõ chính xác "delete" để xác nhận.');
        }
    };

    // Hàm xử lý đăng xuất
    const handleLogoutClick = () => {
        logout(); // Gọi hàm logout từ AuthContext
        navigate('/login'); // Chuyển hướng về trang đăng nhập
    };

    return (
        <SBNV> {/* Bọc toàn bộ nội dung trang bằng SBNV */}
            {/* Nội dung chính của trang Quyền riêng tư */}
            {/* Đảm bảo div này có flex-col và flex-1 để nó có thể cuộn bên trong SBNV */}
            <div className="flex flex-col items-center flex-1 bg-gradient-to-br from-slate-50 to-slate-200 p-8">
                <h2 className="text-4xl font-bold text-slate-800 mb-8 drop-shadow-[0_4px_4px_rgba(0,0,0,0.1)]">Cài đặt quyền riêng tư</h2>
                <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg space-y-6">
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSave}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-2xl font-semibold text-slate-700">Thông tin cá nhân</h3>
                            {isEditing ? (
                                <div className="flex space-x-2">
                                    <Button
                                        type="default"
                                        icon={<X size={18} />}
                                        onClick={handleCancelEdit}
                                        className="rounded-lg border-slate-300 text-slate-600 hover:text-red-500 hover:border-red-400"
                                    >
                                        Hủy bỏ
                                    </Button>
                                    <Button
                                        type="primary"
                                        icon={<Save size={18} />}
                                        onClick={() => form.submit()}
                                        className="bg-blue-500 hover:bg-blue-600 rounded-lg"
                                    >
                                        Lưu thay đổi
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    type="default"
                                    icon={<Edit size={18} />}
                                    onClick={() => setIsEditing(true)}
                                    className="rounded-lg border-blue-500 text-blue-700 hover:text-blue-800 hover:border-blue-600"
                                >
                                    Chỉnh sửa
                                </Button>
                            )}
                        </div>

                        <Form.Item label={<span className="font-semibold"><Clock size={16} className="inline mr-2" />Thời gian tạo tài khoản</span>}>
                            <Input value={user.createdAt ? moment(user.createdAt).format('DD/MM/YYYY HH:mm') : 'N/A'} readOnly />
                        </Form.Item>

                        <Form.Item
                            label={<span className="font-semibold"><User size={16} className="inline mr-2" />Tên tài khoản</span>}
                            name="name"
                            rules={[{ required: true, message: 'Vui lòng nhập tên tài khoản!' }]}
                        >
                            <Input readOnly={!isEditing} />
                        </Form.Item>

                        <Form.Item label={<span className="font-semibold"><Mail size={16} className="inline mr-2" />Email</span>}>
                            <Input value={userEmail} readOnly />
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
                            />
                        </Form.Item>
                    </Form>

                    <div className="mt-6 pt-6 border-t border-slate-200">
                        <Button
                            type="default"
                            icon={<LogOut size={18} />}
                            onClick={handleLogoutClick} // Gọi hàm handleLogoutClick mới
                            className="w-full text-slate-700 border-slate-300 hover:text-blue-700 hover:border-blue-500 rounded-lg"
                            size="large"
                        >
                            Đăng xuất khỏi tài khoản
                        </Button>
                    </div>

                    <div className="border-t border-slate-200 pt-6 mt-6">
                        <h3 className="text-2xl font-semibold text-red-700 mb-4">Xóa tài khoản</h3>
                        <Button
                            type="primary"
                            danger
                            icon={<Trash2 size={18} />}
                            onClick={() => setIsDeleteModalVisible(true)}
                            className="bg-red-500 hover:bg-red-600 rounded-lg"
                        >
                            Xóa tài khoản
                        </Button>
                    </div>
                </div>
            </div>

            {/* Modal xác nhận xóa tài khoản */}
            <Modal
                title="Xác nhận xóa tài khoản"
                open={isDeleteModalVisible} // Đổi từ visible sang open
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
                <p>Bạn có chắc chắn muốn xóa tài khoản của mình không? Hành động này không thể hoàn tác.</p>
                <p>Để xác nhận, vui lòng gõ "<span className="font-bold text-red-500">delete</span>" vào ô bên dưới:</p>
                <Input
                    value={confirmDeleteText}
                    onChange={(e) => setConfirmDeleteText(e.target.value)}
                    placeholder="Gõ 'delete' để xác nhận"
                />
            </Modal>
        </SBNV>
    );
};

export default QuyenRiengTu;
