import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv';
import { Button, message, Spin, Form, Input, Select, Table, Modal, Empty, Tag, Tabs } from 'antd';
import { Edit, Trash2, PlusCircle, Eye, BriefcaseIcon, CheckCircle, XCircle, User as UserIcon, Mail as MailIcon, Phone as PhoneIcon, FileText as FileTextIcon } from 'lucide-react'; // Đổi tên User thành UserIcon, Mail thành MailIcon, Phone thành PhoneIcon, FileText thành FileTextIcon
import axios from 'axios';
import { format, addHours, isBefore } from 'date-fns';
import { vi } from 'date-fns/locale';

const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

const API_URL = 'http://localhost:5000/api/auth';

const QuanLyKhoaHoc = () => {
    const { user, loading: authLoading } = useAuth();
    const [form] = Form.useForm();
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [courses, setCourses] = useState([]); 
    const [loadingCourses, setLoadingCourses] = useState(true); 
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState(null);
    const [allUsers, setAllUsers] = useState([]); 
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [adminCreatedCourses, setAdminCreatedCourses] = useState([]);
    const [loadingAdminCreatedCourses, setLoadingAdminCreatedCourses] = useState(true);
    const [allCourseRegistrations, setAllCourseRegistrations] = useState([]); 
    const [loadingAllCourseRegistrations, setLoadingAllCourseRegistrations] = useState(true);
    const [isRegistrationDetailModalVisible, setIsRegistrationDetailModalVisible] = useState(false);
    const [selectedRegistration, setSelectedRegistration] = useState(null);
    const [loadingRegistrationUpdate, setLoadingRegistrationUpdate] = useState(false);
    const [activeTab, setActiveTab] = useState('manageCourses'); 

    // Hàm lấy danh sách tất cả người dùng (để chọn người phụ trách)
    const fetchAllUsers = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            message.error('Bạn cần đăng nhập để tải danh sách người dùng.');
            setLoadingUsers(false);
            return;
        }
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const res = await axios.get(`${API_URL}/users`, config);
            setAllUsers(Array.isArray(res.data.users) ? res.data.users : []);
        } catch (error) {
            console.error('Lỗi khi tải danh sách người dùng:', error);
            message.error(error.response?.data?.message || 'Không thể tải danh sách người dùng.');
        } finally {
            setLoadingUsers(false);
        }
    }, []);

    // Hàm lấy danh sách khóa học do admin hiện tại tạo
    const fetchAdminCreatedCourses = useCallback(async () => {
        if (!user || user.role !== 'admin') return;
        setLoadingAdminCreatedCourses(true);
        const token = localStorage.getItem('token');
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const res = await axios.get(`${API_URL}/training-courses/my-created`, config);
            setAdminCreatedCourses(res.data);
        } catch (error) {
            console.error('Lỗi khi tải khóa học đã tạo:', error);
            message.error(error.response?.data?.message || 'Không thể tải khóa học đã tạo.');
        } finally {
            setLoadingAdminCreatedCourses(false);
        }
    }, [user]);

    // Hàm lấy tất cả các đăng ký cho các khóa học do admin hiện tại tạo
    const fetchAdminAllRegistrations = useCallback(async () => {
        if (!user || user.role !== 'admin') {
            setLoadingAllCourseRegistrations(false);
            return;
        }
        setLoadingAllCourseRegistrations(true);
        const token = localStorage.getItem('token');
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const res = await axios.get(`${API_URL}/training-courses/admin/all-registrations`, config);
            setAllCourseRegistrations(res.data);
        } catch (error) {
            console.error('Lỗi khi tải tất cả danh sách đăng ký:', error);
            message.error(error.response?.data?.message || 'Không thể tải danh sách đăng ký.');
        } finally {
            setLoadingAllCourseRegistrations(false);
        }
    }, [user]);


    useEffect(() => {
        if (!authLoading && user && user.role === 'admin') {
            fetchAllUsers();
            fetchAdminCreatedCourses();
            fetchAdminAllRegistrations(); // Tải tất cả đăng ký khi component mount
        }
    }, [user, authLoading, fetchAllUsers, fetchAdminCreatedCourses, fetchAdminAllRegistrations]);

    const showAddModal = () => {
        setEditingCourse(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const showEditModal = (record) => {
        // Kiểm tra giới hạn 24 giờ trước khi cho phép chỉnh sửa
        const twentyFourHoursAfterCreation = addHours(new Date(record.creationTime), 24);
        const now = new Date();

        if (isBefore(twentyFourHoursAfterCreation, now)) {
            message.warning('Không thể chỉnh sửa khóa học này vì đã quá 24 giờ kể từ khi tạo.');
            return;
        }

        setEditingCourse(record);
        form.setFieldsValue({
            title: record.title,
            overview: record.overview,
            content: record.content,
            imageUrl: record.imageUrl,
            detailedTime: record.detailedTime,
            mainInChargeId: record.mainInCharge?._id,
        });
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingCourse(null);
        form.resetFields();
    };

    const onFinish = async (values) => {
        setLoadingSubmit(true);
        const token = localStorage.getItem('token');
        if (!token) {
            message.error('Bạn cần đăng nhập để thực hiện thao tác này.');
            setLoadingSubmit(false);
            return;
        }

        const config = {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        };

        try {
            if (editingCourse) {
                // Chỉnh sửa khóa học
                await axios.put(`${API_URL}/training-courses/${editingCourse._id}`, values, config);
                message.success('Cập nhật khóa học thành công!');
            } else {
                // Thêm khóa học mới
                await axios.post(`${API_URL}/training-courses`, values, config);
                message.success('Thêm khóa học mới thành công!');
            }
            setIsModalVisible(false);
            fetchAdminCreatedCourses(); // Cập nhật lại danh sách khóa học đã tạo
            fetchAdminAllRegistrations(); // Cập nhật lại danh sách đăng ký
        } catch (error) {
            console.error('Lỗi khi lưu khóa học:', error);
            message.error(error.response?.data?.message || 'Lưu khóa học thất bại.');
        } finally {
            setLoadingSubmit(false);
        }
    };

    const showDeleteConfirmModal = (record) => {
        setCourseToDelete(record);
        setIsDeleteModalVisible(true);
    };

    const handleDeleteCourse = async () => {
        if (!courseToDelete) return;

        setLoadingCourses(true); // Tạm thời dùng loadingCourses để hiển thị loading
        const token = localStorage.getItem('token');
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            await axios.delete(`${API_URL}/training-courses/${courseToDelete._id}`, config);
            message.success('Khóa đào tạo đã được xóa thành công.');
            setIsDeleteModalVisible(false);
            setCourseToDelete(null);
            fetchAdminCreatedCourses(); // Cập nhật lại danh sách khóa học đã tạo
            fetchAdminAllRegistrations(); // Cập nhật lại danh sách đăng ký
        } catch (error) {
            console.error('Lỗi khi xóa khóa học:', error);
            message.error(error.response?.data?.message || 'Xóa khóa học thất bại.');
        } finally {
            setLoadingCourses(false);
        }
    };

    const showRegistrationDetailModal = async (registration) => {
        setSelectedRegistration(registration);
        setIsRegistrationDetailModalVisible(true);
    };

    const handleRegistrationDetailModalClose = () => {
        setIsRegistrationDetailModalVisible(false);
        setSelectedRegistration(null);
    };

    const handleUpdateRegistrationStatus = async (status, recordToUpdate) => {
        console.log('Attempting to update registration status:', status, 'for record:', recordToUpdate); 
        if (!recordToUpdate) {
            console.error('Record to update is undefined.');
            message.error('Không tìm thấy thông tin đăng ký để cập nhật.');
            return;
        }

        setSelectedRegistration(recordToUpdate);
        setLoadingRegistrationUpdate(true);

        const token = localStorage.getItem('token');
        if (!token) {
            message.error('Bạn cần đăng nhập để thực hiện thao tác này.');
            setLoadingRegistrationUpdate(false);
            return;
        }

        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            };
            const response = await axios.put(`${API_URL}/training-courses/registrations/${recordToUpdate._id}/status`, { status }, config);
            console.log('API Response for status update:', response.data); 

            message.success(`Đăng ký đã được ${status === 'approved' ? 'duyệt' : 'từ chối'} thành công.`);
            setIsRegistrationDetailModalVisible(false); // Đóng modal nếu đang mở
            fetchAdminAllRegistrations(); // Cập nhật lại danh sách đăng ký
        } catch (error) {
            console.error('Lỗi khi cập nhật trạng thái đăng ký:', error.response?.data || error.message);
            // Hiển thị lỗi cụ thể từ backend nếu có
            message.error(error.response?.data?.message || 'Cập nhật trạng thái thất bại.');
        } finally {
            setLoadingRegistrationUpdate(false);
            setSelectedRegistration(null);
        }
    };

    const getRegistrationStatusTag = (status) => {
        let color = 'gold';
        if (status === 'approved') color = 'green';
        if (status === 'rejected') color = 'red';
        return <Tag color={color}>{status === 'pending' ? 'Đang chờ duyệt' : status === 'approved' ? 'Đã duyệt' : 'Từ chối'}</Tag>;
    };


    const coursesColumns = [
        {
            title: 'Tiêu đề',
            dataIndex: 'title',
            key: 'title',
            width: 150, 
            ellipsis: true,
        },
        {
            title: 'Tổng quan',
            dataIndex: 'overview',
            key: 'overview',
            width: 250, 
            ellipsis: true,
        },
        {
            title: 'Người phụ trách',
            dataIndex: ['mainInCharge', 'name'],
            key: 'mainInCharge',
            width: 200, 
            render: (text, record) => {
                const name = record.mainInCharge?.name || 'N/A';
                const email = record.mainInCharge?.email;
                const position = record.mainInCharge?.position;
                return (
                    <div>
                        {name} {email ? `(${email})` : ''}
                        {position && <p className="text-gray-500 text-sm italic mb-0">{position}</p>}
                    </div>
                );
            },
        },
        {
            title: 'Thời gian chi tiết',
            dataIndex: 'detailedTime',
            key: 'detailedTime',
            width: 180, 
            ellipsis: true,
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (text) => text ? format(new Date(text), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A',
            width: 150,
        },
        {
            title: 'Hành động',
            key: 'action',
            width: 120, 
            fixed: 'right',
            render: (text, record) => (
                <div className="flex space-x-2">
                    <Button
                        type="primary"
                        icon={<Edit size={16} />}
                        onClick={() => showEditModal(record)}
                        className="bg-blue-500 hover:bg-blue-600 rounded-lg"
                        title="Chỉnh sửa"
                        disabled={isBefore(addHours(new Date(record.creationTime), 24), new Date())} // Vô hiệu hóa nếu quá 24h
                    />
                    <Button
                        type="primary"
                        danger
                        icon={<Trash2 size={16} />}
                        onClick={() => showDeleteConfirmModal(record)}
                        className="bg-red-500 hover:bg-red-600 rounded-lg"
                        title="Xóa"
                    />
                </div>
            ),
        },
    ];

    const registrationsColumns = [
        {
            title: 'Khóa học',
            dataIndex: ['course', 'title'],
            key: 'courseTitle',
            width: 180, 
            ellipsis: true,
            render: (text, record) => record.course?.title || 'N/A',
        },
        {
            title: 'Người đăng ký',
            dataIndex: ['user', 'name'], 
            key: 'userName',
            width: 180, 
            ellipsis: true, 
            render: (text, record) => {
                const name = record.user?.name || 'N/A';
                const email = record.user?.email || ''; 
                const position = record.user?.position || '';
                return (
                    <div>
                        {name} {email ? `(${email})` : ''}
                        {position && <p className="text-gray-500 text-sm italic mb-0">{position}</p>}
                    </div>
                );
            },
        },
        {
            title: 'SĐT',
            dataIndex: 'phoneNumber',
            key: 'phoneNumber',
            width: 100, 
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status) => getRegistrationStatusTag(status), 
        },
        {
            title: 'Ngày đăng ký',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (text) => text ? format(new Date(text), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A',
            width: 150, 
        },
        {
            title: 'Hành động',
            key: 'action',
            width: 180, 
            fixed: 'right',
            render: (text, record) => (
                <div className="flex space-x-2">
                    <Button
                        type="default"
                        icon={<Eye size={16} />}
                        onClick={() => showRegistrationDetailModal(record)}
                        className="rounded-lg border-blue-600 text-blue-600 hover:text-blue-700 hover:border-blue-700"
                        title="Xem chi tiết"
                    />
                    {record.status === 'pending' && (
                        <>
                            <Button
                                type="primary"
                                icon={<CheckCircle size={16} />}
                                onClick={() => handleUpdateRegistrationStatus('approved', record)}
                                className="bg-green-500 hover:bg-green-600 rounded-lg"
                                title="Duyệt"
                                loading={loadingRegistrationUpdate && selectedRegistration?._id === record._id}
                            />
                            <Button
                                type="primary"
                                danger
                                icon={<XCircle size={16} />}
                                onClick={() => handleUpdateRegistrationStatus('rejected', record)} 
                                className="bg-red-500 hover:bg-red-600 rounded-lg"
                                title="Từ chối"
                                loading={loadingRegistrationUpdate && selectedRegistration?._id === record._id}
                            />
                        </>
                    )}
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
                        Quản Lý Khóa Đào Tạo
                    </h1>
                    <p className="text-xl text-gray-700">
                        Chào mừng <span className="text-sky-600 font-bold">{user.name}</span>! Quản lý các khóa học của bạn.
                    </p>
                </div>

                <div className="w-full max-w-7xl mt-8 bg-white p-8 rounded-lg shadow-xl mb-12">
                    <Tabs defaultActiveKey="manageCourses" activeKey={activeTab} onChange={setActiveTab} centered>
                        <TabPane tab="Quản lý Khóa Học" key="manageCourses">
                            <div className="flex justify-end mb-6">
                                <Button
                                    type="primary"
                                    icon={<PlusCircle size={18} />}
                                    onClick={showAddModal}
                                    className="bg-blue-600 hover:bg-blue-700 rounded-lg"
                                >
                                    Thêm Khóa Học Mới
                                </Button>
                            </div>
                            <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">Khóa Học Đã Tạo</h2>
                            {loadingAdminCreatedCourses ? (
                                <div className="flex items-center justify-center py-8">
                                    <Spin size="large" tip="Đang tải danh sách khóa học đã tạo..." />
                                </div>
                            ) : adminCreatedCourses.length > 0 ? (
                                <Table
                                    columns={coursesColumns}
                                    dataSource={adminCreatedCourses}
                                    rowKey="_id"
                                    pagination={{ pageSize: 10 }}
                                    className="shadow-md rounded-lg overflow-hidden"
                                    scroll={{ x: 'max-content' }}
                                />
                            ) : (
                                <Empty description="Bạn chưa tạo khóa học nào." />
                            )}
                        </TabPane>
                        <TabPane tab="Quản lý Đăng Ký Khóa Học" key="manageRegistrations">
                            <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">Danh Sách Đăng Ký</h2>
                            {loadingAllCourseRegistrations ? (
                                <div className="flex items-center justify-center py-8">
                                    <Spin size="large" tip="Đang tải danh sách đăng ký..." />
                                </div>
                            ) : allCourseRegistrations.length > 0 ? (
                                <Table
                                    columns={registrationsColumns}
                                    dataSource={allCourseRegistrations}
                                    rowKey="_id"
                                    pagination={{ pageSize: 10 }}
                                    className="shadow-md rounded-lg overflow-hidden"
                                    scroll={{ x: 'max-content' }}
                                />
                            ) : (
                                <Empty description="Chưa có đăng ký nào cho các khóa học bạn đã tạo." />
                            )}
                        </TabPane>
                    </Tabs>
                </div>
            </div>

            {/* Modal thêm/chỉnh sửa khóa học */}
            <Modal
                title={editingCourse ? "Chỉnh sửa Khóa Đào Tạo" : "Thêm Khóa Đào Tạo Mới"}
                open={isModalVisible}
                onCancel={handleCancel}
                footer={null}
                width={700}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    className="mt-4"
                >
                    <Form.Item
                        name="title"
                        label="Tiêu đề khóa học"
                        rules={[{ required: true, message: 'Vui lòng nhập tiêu đề khóa học!' }]}
                    >
                        <Input placeholder="Ví dụ: Kỹ năng IT cơ bản" />
                    </Form.Item>
                    <Form.Item
                        name="overview"
                        label="Tổng quan (tối đa 100 ký tự hiển thị bên ngoài)"
                        rules={[{ required: true, message: 'Vui lòng nhập tổng quan khóa học!' }]}
                    >
                        <TextArea rows={2} placeholder="Mô tả ngắn gọn về khóa học..." maxLength={100} showCount />
                    </Form.Item>
                    <Form.Item
                        name="content"
                        label="Nội dung chi tiết"
                        rules={[{ required: true, message: 'Vui lòng nhập nội dung chi tiết khóa học!' }]}
                    >
                        <TextArea rows={6} placeholder="Nội dung đầy đủ của khóa học..." />
                    </Form.Item>
                    <Form.Item
                        name="imageUrl"
                        label="URL ảnh minh họa (tùy chọn)"
                    >
                        <Input placeholder="Dán URL ảnh vào đây, ví dụ: https://example.com/image.jpg" />
                    </Form.Item>
                    <Form.Item
                        name="detailedTime"
                        label="Thời gian chi tiết"
                        rules={[{ required: true, message: 'Vui lòng nhập thời gian chi tiết khóa học!' }]}
                    >
                        <Input placeholder="Ví dụ: Thứ 3, 10/08/2025, 9:00 AM - 12:00 PM" />
                    </Form.Item>
                    <Form.Item
                        name="mainInChargeId"
                        label="Người phụ trách chính"
                        rules={[{ required: true, message: 'Vui lòng chọn người phụ trách chính!' }]}
                    >
                        {loadingUsers ? (
                            <div className="flex items-center justify-center py-2">
                                <Spin size="small" tip="Đang tải danh sách người dùng..." />
                            </div>
                        ) : (
                            <Select
                                showSearch
                                placeholder="Chọn người phụ trách chính"
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                    String(option.children).toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                {allUsers.map(u => (
                                    <Option key={u._id} value={u._id}>
                                        {u.name} ({u.email}) - {u.role}
                                    </Option>
                                ))}
                            </Select>
                        )}
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loadingSubmit} className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg">
                            {editingCourse ? "Cập nhật Khóa Học" : "Thêm Khóa Học"}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Modal xác nhận xóa khóa học */}
            <Modal
                title="Xác nhận xóa khóa học"
                open={isDeleteModalVisible}
                onOk={handleDeleteCourse}
                onCancel={() => setIsDeleteModalVisible(false)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
            >
                <p>Bạn có chắc chắn muốn xóa khóa học này không?</p>
                {courseToDelete && (
                    <p>Tiêu đề: <strong>"{courseToDelete.title}"</strong></p>
                )}
            </Modal>

            {/* Modal chi tiết đăng ký và duyệt/từ chối */}
            <Modal
                title="Chi tiết Đăng Ký Khóa Học"
                open={isRegistrationDetailModalVisible}
                onCancel={handleRegistrationDetailModalClose}
                footer={[
                    <Button key="cancel" onClick={handleRegistrationDetailModalClose} className="rounded-lg">
                        Đóng
                    </Button>,
                    selectedRegistration?.status === 'pending' && (
                        <Button
                            key="reject"
                            type="primary"
                            danger
                            onClick={() => handleUpdateRegistrationStatus('rejected', selectedRegistration)} // Truyền selectedRegistration
                            loading={loadingRegistrationUpdate && selectedRegistration?._id === selectedRegistration._id}
                            icon={<XCircle size={16} />}
                            className="bg-red-500 hover:bg-red-600 rounded-lg"
                        >
                            Từ chối
                        </Button>
                    ),
                    selectedRegistration?.status === 'pending' && (
                        <Button
                            key="approve"
                            type="primary"
                            onClick={() => handleUpdateRegistrationStatus('approved', selectedRegistration)} 
                            loading={loadingRegistrationUpdate && selectedRegistration?._id === selectedRegistration._id}
                            icon={<CheckCircle size={16} />}
                            className="bg-green-600 hover:bg-green-700 rounded-lg"
                        >
                            Duyệt
                        </Button>
                    ),
                ]}
                width={600}
            >
                {selectedRegistration ? (
                    <div className="p-4">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4">Thông tin người đăng ký</h3>
                        <p className="flex items-center mb-2"><UserIcon size={18} className="mr-2 text-blue-500" /> <strong>Họ và tên:</strong>&nbsp;{selectedRegistration.fullName}</p>
                        <p className="flex items-center mb-2"><MailIcon size={18} className="mr-2 text-blue-500" /> <strong>Email:</strong>&nbsp;{selectedRegistration.email}</p>
                        <p className="flex items-center mb-2"><PhoneIcon size={18} className="mr-2 text-blue-500" /> <strong>Số điện thoại:</strong>&nbsp;{selectedRegistration.phoneNumber}</p>
                        {selectedRegistration.user?.position && ( 
                            <p className="flex items-center mb-2"><BriefcaseIcon size={18} className="mr-2 text-blue-500" /> <strong>Chức vụ:</strong>&nbsp;{selectedRegistration.user.position}</p>
                        )}
                        <p className="flex items-start mb-2"><FileTextIcon size={18} className="mr-2 text-blue-500" /> <strong>Ghi chú:</strong>&nbsp;{selectedRegistration.notes || 'Không có'}</p>
                        <p className="flex items-center mb-2"><strong>Khóa học:</strong>&nbsp;{selectedRegistration.course?.title || 'N/A'}</p>
                        <p className="flex items-center mb-2"><strong>Trạng thái:</strong>&nbsp;{getRegistrationStatusTag(selectedRegistration.status)}</p>
                        <p className="flex items-center mb-2"><strong>Thời gian đăng ký:</strong>&nbsp;{format(new Date(selectedRegistration.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}</p>
                    </div>
                ) : (
                    <Spin tip="Đang tải chi tiết đăng ký..." />
                )}
            </Modal>
        </SBNV>
    );
};

export default QuanLyKhoaHoc;
