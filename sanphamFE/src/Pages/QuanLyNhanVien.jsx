import React, { useState, useEffect } from "react";
import { Table, Modal, Form, Input, Select, message, Button } from "antd"; // Import Button here as it's still used in this component
import { Plus, Edit, Trash2 } from "lucide-react"; // Giữ lại các icons cần thiết cho Table
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from '../Context/AuthContext';
import axios from "axios";
import SBNV from '../ChucNang/sbnv'; // Import SBNV component

const { Option } = Select;

const QuanTriVienAdd = () => {
    const { user, loading } = useAuth(); // Bỏ 'logout' vì SBNV sẽ xử lý
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [deleteForm] = Form.useForm();
    const [editingUser, setEditingUser] = useState(null);
    const [deletingUser, setDeletingUser] = useState(null);

    const fetchUsers = async () => {
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            };
            const { data } = await axios.get('/api/auth/users', config);
            if (Array.isArray(data)) {
                setUsers(data);
            } else {
                console.warn("Dữ liệu nhận được từ API /api/auth/users không phải là mảng:", data);
                setUsers([]);
            }
        } catch (error) {
            message.error(error.response?.data?.message || "Lỗi khi tải danh sách người dùng.");
            setUsers([]);
        }
    };

    useEffect(() => {
        if (user && user.role === 'admin') {
            fetchUsers();
        } else if (!loading) {
            navigate('/');
        }
    }, [user, loading, navigate]);

    const handleAddUser = () => {
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleEditUser = (record) => {
        setEditingUser(record);
        form.setFieldsValue({
            ...record,
            skills: Array.isArray(record.skills) ? record.skills.join(', ') : '' // Chuyển mảng skills thành chuỗi
        });
        setIsEditModalVisible(true);
    };

    const handleDeleteConfirm = (record) => {
        setDeletingUser(record);
        setIsDeleteModalVisible(true);
        deleteForm.resetFields();
    };

    const handleModalCancel = () => {
        setIsModalVisible(false);
        setIsEditModalVisible(false);
        form.resetFields();
        setEditingUser(null);
    };

    const handleDeleteModalCancel = () => {
        setIsDeleteModalVisible(false);
        setDeletingUser(null);
        deleteForm.resetFields();
    };

    const handleFormSubmit = async (values) => {
        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            };

            const dataToSend = { ...values };
            if (dataToSend.skills && typeof dataToSend.skills === 'string') {
                dataToSend.skills = dataToSend.skills.split(',').map(s => s.trim()).filter(s => s !== '');
            } else {
                dataToSend.skills = []; // Ensure skills is an array even if empty
            }

            if (editingUser) {
                // Remove password from update if it's empty
                if (dataToSend.password === "") {
                    delete dataToSend.password;
                }
                await axios.put(`/api/auth/users/${editingUser._id}`, dataToSend, config);
                message.success("Cập nhật tài khoản thành công!");
            } else {
                await axios.post('/api/auth/register', dataToSend, config);
                message.success("Thêm tài khoản thành công!");
            }

            fetchUsers();
            handleModalCancel();
        } catch (error) {
            message.error(error.response?.data?.message || "Lỗi khi thực hiện thao tác.");
        }
    };

    const handleDelete = async (values) => {
        if (values.confirmation === 'delete' && deletingUser) {
            try {
                const config = {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                };
                await axios.delete(`/api/auth/users/${deletingUser._id}`, config);
                message.success("Xóa tài khoản thành công!");
                fetchUsers();
                handleDeleteModalCancel();
            } catch (error) {
                message.error(error.response?.data?.message || "Lỗi khi xóa tài khoản.");
            }
        } else {
            message.error("Vui lòng nhập 'delete' để xác nhận.");
        }
    };

    // Bỏ handleLogout vì SBNV đã xử lý

    const columns = [
        {
            title: 'Tên',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Vai trò',
            dataIndex: 'role',
            key: 'role',
        },
        {
            title: 'Biệt danh',
            dataIndex: 'nickname',
            key: 'nickname',
        },
        {
            title: 'Hành động',
            key: 'actions',
            render: (text, record) => (
                <div className="space-x-2">
                    <Button
                        type="primary"
                        icon={<Edit size={16} />}
                        onClick={() => handleEditUser(record)}
                        className="bg-green-500 hover:bg-green-600"
                    >
                        Sửa
                    </Button>
                    <Button
                        type="danger"
                        icon={<Trash2 size={16} />}
                        onClick={() => handleDeleteConfirm(record)}
                        className="bg-red-500 hover:bg-red-600"
                    >
                        Xóa
                    </Button>
                </div>
            ),
        },
    ];

    if (loading || (user && user.role !== 'admin')) {
        return (
            <div className="flex items-center justify-center h-screen text-xl text-slate-700">
                {loading ? "Đang tải..." : "Bạn không có quyền truy cập trang này."}
            </div>
        );
    }

    return (
        <SBNV> {/* Bọc toàn bộ nội dung trong SBNV */}
            <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-200 min-h-full">
                <div className="flex justify-end mb-4">
                    <Button
                        type="primary"
                        icon={<Plus size={18} />}
                        onClick={handleAddUser}
                        className="bg-blue-600 hover:bg-blue-700 rounded-lg"
                    >
                        Thêm tài khoản mới
                    </Button>
                </div>
                <Table
                    dataSource={users}
                    columns={columns}
                    rowKey="_id"
                    pagination={{ pageSize: 10 }}
                    className="shadow-lg rounded-lg bg-white"
                />

                <Modal
                    title={editingUser ? "Chỉnh sửa tài khoản" : "Thêm tài khoản mới"}
                    visible={isModalVisible || isEditModalVisible}
                    onCancel={handleModalCancel}
                    footer={null}
                >
                    <Form form={form} layout="vertical" onFinish={handleFormSubmit} initialValues={editingUser}>
                        <Form.Item
                            name="name"
                            label="Tên"
                            rules={[{ required: true, message: 'Vui lòng nhập tên!' }]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            name="email"
                            label="Email"
                            rules={[{ required: true, message: 'Vui lòng nhập email!' }, { type: 'email', message: 'Email không hợp lệ!' }]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            name="password"
                            label="Mật khẩu"
                            rules={editingUser ? [] : [{ required: true, message: 'Vui lòng nhập mật khẩu!' },
                            {
                                pattern: /^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{6,})/,
                                message: 'Mật khẩu phải có ít nhất 6 ký tự, bao gồm ít nhất một số và một ký tự đặc biệt.',
                            }
                            ]}
                        >
                            <Input.Password placeholder={editingUser ? "Để trống nếu không muốn thay đổi" : ""} />
                        </Form.Item>
                        <Form.Item
                            name="role"
                            label="Vai trò"
                            rules={[{ required: true, message: 'Vui lòng chọn vai trò!' }]}
                        >
                            <Select>
                                <Option value="user">User</Option>
                                <Option value="admin">Admin</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name="nickname" label="Biệt danh">
                            <Input />
                        </Form.Item>
                        <Form.Item name="bio" label="Tiểu sử">
                            <Input.TextArea />
                        </Form.Item>
                        <Form.Item name="introduction" label="Giới thiệu">
                            <Input.TextArea />
                        </Form.Item>
                        <Form.Item name="skills" label="Kỹ năng (phân cách bằng dấu phẩy)">
                            <Input placeholder="Ví dụ: React, Node.js, MongoDB" />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" className="bg-blue-600 hover:bg-blue-700 w-full">
                                {editingUser ? "Cập nhật" : "Thêm"}
                            </Button>
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title="Xác nhận xóa tài khoản"
                    visible={isDeleteModalVisible}
                    onCancel={handleDeleteModalCancel}
                    footer={null}
                >
                    <p>Bạn có chắc chắn muốn xóa tài khoản **{deletingUser?.name}** không?</p>
                    <p>Vui lòng nhập <span className="font-bold text-red-500">'delete'</span> vào ô bên dưới để xác nhận:</p>
                    <Form form={deleteForm} onFinish={handleDelete}>
                        <Form.Item
                            name="confirmation"
                            rules={[{ required: true, message: 'Vui lòng nhập "delete" để xác nhận!' }]}
                        >
                            <Input placeholder="Nhập delete" />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" className="bg-red-600 hover:bg-red-700 w-full">
                                Xóa tài khoản
                            </Button>
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </SBNV>
    );
};

export default QuanTriVienAdd;