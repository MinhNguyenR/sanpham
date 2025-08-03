// frontend/src/Pages/QuanLyNhanVien.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Table, Modal, Form, Input, Select, message, Button, Tag, Spin } from "antd"; // Import Tag và Spin
import { Plus, Edit, Trash2, Search as SearchIcon } from "lucide-react"; // Import SearchIcon
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from '../Context/AuthContext';
import axios from "axios";
import SBNV from '../ChucNang/sbnv'; // Import SBNV component

const { Option } = Select;
const { Search } = Input; // Destructure Search from Input

const QuanLyNhanVien = () => {
    const { user, loading: authLoading } = useAuth(); // Đổi tên 'loading' thành 'authLoading' để tránh nhầm lẫn
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]); // Đổi tên 'users' thành 'employees' cho rõ ràng
    const [loadingEmployees, setLoadingEmployees] = useState(true); // Thêm loading state cho bảng
    const [isAddEditModalVisible, setIsAddEditModalVisible] = useState(false); // Gộp 2 modal thêm/sửa
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [deleteForm] = Form.useForm();
    const [editingEmployee, setEditingEmployee] = useState(null); // Đổi tên 'editingUser'
    const [deletingEmployee, setDeletingEmployee] = useState(null); // Đổi tên 'deletingUser'
    const [searchTerm, setSearchTerm] = useState(''); // State cho từ khóa tìm kiếm

    // Hàm fetchUsers được đổi tên thành fetchEmployees cho rõ ràng và thêm searchTerm
    const fetchEmployees = useCallback(async (currentSearchTerm = '') => {
        if (!user || user.role !== 'admin') {
            setLoadingEmployees(false);
            return;
        }

        setLoadingEmployees(true);
        const token = localStorage.getItem('token');
        if (!token) {
            message.error('Bạn cần đăng nhập để tải danh sách nhân viên.');
            setLoadingEmployees(false);
            return;
        }

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                params: { // Thêm params để gửi từ khóa tìm kiếm
                    keyword: currentSearchTerm,
                }
            };
            // Gọi API /api/auth/users (backend sẽ cần được cập nhật để xử lý keyword)
            const { data } = await axios.get('/api/auth/users', config);
            console.log("Fetched raw data for QuanLyNhanVien:", data); // Log dữ liệu thô
            // Sửa lỗi: Backend trả về { users: [...] }
            if (data && Array.isArray(data.users)) {
                setEmployees(data.users);
            } else if (Array.isArray(data)) { // Trường hợp backend trả về trực tiếp mảng (ít xảy ra với cấu trúc hiện tại)
                setEmployees(data);
            } else {
                console.warn("Dữ liệu nhận được từ API /api/auth/users không phải là mảng hoặc không có thuộc tính 'users':", data);
                setEmployees([]);
            }
        } catch (error) {
            console.error('Lỗi khi tải danh sách nhân viên:', error);
            message.error(error.response?.data?.message || "Không thể tải danh sách nhân viên.");
            setEmployees([]);
        } finally {
            setLoadingEmployees(false);
        }
    }, [user]); // Thêm user vào dependency array

    useEffect(() => {
        if (!authLoading && user && user.role === 'admin') {
            fetchEmployees(searchTerm); // Gọi fetch với searchTerm ban đầu
        } else if (!authLoading && (!user || user.role !== 'admin')) {
            // Nếu không phải admin và đã tải xong auth, chuyển hướng
            navigate('/');
        }
    }, [user, authLoading, navigate, fetchEmployees, searchTerm]); // Thêm searchTerm vào dependency array

    const handleAddUser = () => {
        form.resetFields();
        setEditingEmployee(null); // Đảm bảo là chế độ thêm mới
        setIsAddEditModalVisible(true);
    };

    const handleEditUser = (record) => {
        setEditingEmployee(record);
        form.setFieldsValue({
            ...record,
            skills: Array.isArray(record.skills) ? record.skills.join(', ') : '' // Chuyển mảng skills thành chuỗi
        });
        setIsAddEditModalVisible(true);
    };

    const handleDeleteConfirm = (record) => {
        setDeletingEmployee(record);
        setIsDeleteModalVisible(true);
        deleteForm.resetFields();
    };

    const handleModalCancel = () => {
        setIsAddEditModalVisible(false);
        form.resetFields();
        setEditingEmployee(null);
    };

    const handleDeleteModalCancel = () => {
        setIsDeleteModalVisible(false);
        setDeletingEmployee(null);
        deleteForm.resetFields();
    };

    const handleFormSubmit = async (values) => {
        setLoadingEmployees(true); // Bật loading cho toàn bộ bảng
        console.log("Submitting form with values:", values); // LOG THÊM ĐỂ KIỂM TRA TẤT CẢ GIÁ TRỊ
        console.log("Email value before sending:", values.email); // LOG CỤ THỂ CHO EMAIL

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

            if (editingEmployee) {
                // Remove password from update if it's empty
                if (dataToSend.password === "") {
                    delete dataToSend.password;
                }
                console.log("Sending PUT request to:", `/api/auth/users/${editingEmployee._id}`);
                console.log("Payload for PUT request:", dataToSend);
                await axios.put(`/api/auth/users/${editingEmployee._id}`, dataToSend, config);
                message.success("Cập nhật tài khoản thành công!");
            } else {
                console.log("Sending POST request to: /api/auth/register");
                console.log("Payload for POST request:", dataToSend);
                await axios.post('/api/auth/register', dataToSend, config);
                message.success("Thêm tài khoản thành công!");
            }

            fetchEmployees(searchTerm); // Refresh list with current search term
            handleModalCancel();
        } catch (error) {
            console.error('Lỗi khi thực hiện thao tác:', error);
            message.error(error.response?.data?.message || "Lỗi khi thực hiện thao tác.");
        } finally {
            setLoadingEmployees(false); // Tắt loading
        }
    };

    const handleDelete = async (values) => {
        if (values.confirmation === 'delete' && deletingEmployee) {
            setLoadingEmployees(true); // Bật loading
            try {
                const config = {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                };
                await axios.delete(`/api/auth/users/${deletingEmployee._id}`, config);
                message.success("Xóa tài khoản thành công!");
                fetchEmployees(searchTerm); // Refresh list with current search term
                handleDeleteModalCancel();
            } catch (error) {
                console.error('Lỗi khi xóa tài khoản:', error);
                message.error(error.response?.data?.message || "Lỗi khi xóa tài khoản.");
            } finally {
                setLoadingEmployees(false); // Tắt loading
            }
        } else {
            message.error("Vui lòng nhập 'delete' để xác nhận.");
        }
    };

    const handleSearch = (value) => {
        setSearchTerm(value);
        // fetchEmployees(value); // Gọi fetch ngay khi search
    };

    const employeeColumns = [
        {
            title: 'Tên',
            dataIndex: 'name',
            key: 'name',
            width: 150,
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            width: 200,
        },
        {
            title: 'Vai trò',
            dataIndex: 'role',
            key: 'role',
            render: (role) => (
                <Tag color={role === 'admin' ? 'purple' : 'blue'}>
                    {role.toUpperCase()}
                </Tag>
            ),
            width: 100,
        },
        {
            title: 'Biệt danh',
            dataIndex: 'nickname',
            key: 'nickname',
            width: 120,
            render: (text) => text || 'N/A',
        },
        {
            title: 'Kỹ năng',
            dataIndex: 'skills',
            key: 'skills',
            width: 200,
            render: (skills) => (
                Array.isArray(skills) && skills.length > 0
                    ? skills.map((skill, index) => (
                        <Tag key={index} color="geekblue">{skill}</Tag>
                    ))
                    : 'N/A'
            ),
        },
        {
            title: 'Hành động',
            key: 'actions',
            width: 180,
            render: (text, record) => (
                <div className="flex space-x-2">
                    <Button
                        type="primary"
                        icon={<Edit size={16} />}
                        onClick={() => handleEditUser(record)}
                        className="bg-green-500 hover:bg-green-600 rounded-lg"
                    >
                        Sửa
                    </Button>
                    <Button
                        type="primary"
                        danger
                        icon={<Trash2 size={16} />}
                        onClick={() => handleDeleteConfirm(record)}
                        className="bg-red-500 hover:bg-red-600 rounded-lg"
                    >
                        Xóa
                    </Button>
                </div>
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
                        Quản Lý Nhân Viên
                    </h1>
                    <p className="text-xl text-gray-700">
                        Chào mừng <span className="text-sky-600 font-bold">{user.name}</span>!
                    </p>
                </div>

                <div className="w-full max-w-6xl mt-8 bg-white p-8 rounded-lg shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                        <Search
                            placeholder="Tìm kiếm theo tên hoặc email"
                            allowClear
                            enterButton={<SearchIcon size={18} />}
                            size="large"
                            onSearch={handleSearch}
                            style={{ width: 400 }}
                        />
                        <Button
                            type="primary"
                            icon={<Plus size={18} />}
                            onClick={handleAddUser}
                            className="bg-blue-600 hover:bg-blue-700 rounded-lg"
                        >
                            Thêm tài khoản mới
                        </Button>
                    </div>
                    {loadingEmployees ? (
                        <div className="flex items-center justify-center py-8">
                            <Spin size="large" tip="Đang tải danh sách nhân viên..." />
                        </div>
                    ) : (
                        employees.length > 0 ? (
                            <Table
                                dataSource={employees}
                                columns={employeeColumns}
                                rowKey="_id"
                                pagination={{ pageSize: 10 }}
                                className="shadow-lg rounded-lg bg-white"
                                scroll={{ x: 'max-content' }}
                            />
                        ) : (
                            <Empty description="Không có nhân viên nào." />
                        )
                    )}
                </div>

                <Modal
                    title={editingEmployee ? "Chỉnh sửa tài khoản" : "Thêm tài khoản mới"}
                    open={isAddEditModalVisible} // Sử dụng 'open' thay vì 'visible' cho Antd v5+
                    onCancel={handleModalCancel}
                    footer={null}
                >
                    <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
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
                            rules={[
                                { required: true, message: 'Vui lòng nhập email!' },
                                { type: 'email', message: 'Email không hợp lệ!' } // Đã thêm lại type: 'email'
                            ]}
                            normalize={(value) => value.trim()} // Thêm normalize để loại bỏ khoảng trắng
                            validateTrigger="onBlur" // Thêm validateTrigger
                        >
                            <Input
                                disabled={!!editingEmployee}
                                onChange={(e) => {
                                    console.log("Raw email input value (onChange):", e.target.value);
                                }}
                            /> {/* Disable email khi chỉnh sửa */}
                        </Form.Item>
                        <Form.Item
                            name="password"
                            label="Mật khẩu"
                            rules={editingEmployee ? [] : [{ required: true, message: 'Vui lòng nhập mật khẩu!' },
                            {
                                pattern: /^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{6,})/,
                                message: 'Mật khẩu phải có ít nhất 6 ký tự, bao gồm ít nhất một số và một ký tự đặc biệt.',
                            }
                            ]}
                        >
                            <Input.Password placeholder={editingEmployee ? "Để trống nếu không muốn thay đổi" : ""} />
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
                            <Button type="primary" htmlType="submit" loading={loadingEmployees} className="bg-blue-600 hover:bg-blue-700 w-full rounded-lg">
                                {editingEmployee ? "Cập nhật" : "Thêm"}
                            </Button>
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title="Xác nhận xóa tài khoản"
                    open={isDeleteModalVisible} // Sử dụng 'open' thay vì 'visible'
                    onCancel={handleDeleteModalCancel}
                    footer={null}
                >
                    <p>Bạn có chắc chắn muốn xóa tài khoản **{deletingEmployee?.name}** không? Hành động này không thể hoàn tác.</p>
                    <p>Vui lòng nhập <span className="font-bold text-red-500">'delete'</span> vào ô bên dưới để xác nhận:</p>
                    <Form form={deleteForm} onFinish={handleDelete}>
                        <Form.Item
                            name="confirmation"
                            rules={[{ required: true, message: 'Vui lòng nhập "delete" để xác nhận!' }]}
                        >
                            <Input placeholder="Nhập delete" />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loadingEmployees} className="bg-red-600 hover:bg-red-700 w-full rounded-lg">
                                Xóa tài khoản
                            </Button>
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </SBNV>
    );
};

export default QuanLyNhanVien;
