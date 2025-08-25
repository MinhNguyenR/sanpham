import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv';
import { Button, message, Spin, Card, Row, Col, Modal, Form, Input, Empty, Tag, Typography } from 'antd';
import { BookOpen, Calendar, User, Phone, Mail, FileText, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const { TextArea } = Input;
const { Title, Text } = Typography;

const API_URL = 'http://localhost:5000/api/auth';

const KhoaHoc = () => {
    const { user, loading: authLoading } = useAuth();
    const [courses, setCourses] = useState([]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
    const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [loadingRegister, setLoadingRegister] = useState(false);
    const [userRegistrations, setUserRegistrations] = useState([]);
    const [loadingUserRegistrations, setLoadingUserRegistrations] = useState(true);

    const fetchCourses = useCallback(async () => {
        setLoadingCourses(true);
        const token = localStorage.getItem('token');
        if (!token) {
            message.error('Bạn cần đăng nhập để xem khóa học.');
            setLoadingCourses(false);
            return;
        }
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const res = await axios.get(`${API_URL}/training-courses`, config);
            setCourses(res.data);
        } catch (error) {
            console.error('Lỗi khi tải danh sách khóa học:', error);
            message.error(error.response?.data?.message || 'Không thể tải danh sách khóa học.');
        } finally {
            setLoadingCourses(false);
        }
    }, []);

    const fetchUserRegistrations = useCallback(async () => {
        if (!user) {
            setLoadingUserRegistrations(false);
            return;
        }
        setLoadingUserRegistrations(true);
        const token = localStorage.getItem('token');
        if (!token) {
            setLoadingUserRegistrations(false);
            return;
        }
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const res = await axios.get(`${API_URL}/training-courses/my-registrations`, config);
            setUserRegistrations(res.data);
        } catch (error) {
            console.error('Lỗi khi tải lịch sử đăng ký:', error);
            message.error(error.response?.data?.message || 'Không thể tải lịch sử đăng ký của bạn.');
        } finally {
            setLoadingUserRegistrations(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchCourses();
            fetchUserRegistrations();
        }
    }, [user, authLoading, fetchCourses, fetchUserRegistrations]);

    const showDetailModal = async (courseId) => {
        setLoadingCourses(true);
        const token = localStorage.getItem('token');
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const res = await axios.get(`${API_URL}/training-courses/${courseId}`, config);
            setSelectedCourse(res.data);
            setIsDetailModalVisible(true);
        } catch (error) {
            console.error('Lỗi khi tải chi tiết khóa học:', error);
            message.error(error.response?.data?.message || 'Không thể tải chi tiết khóa học.');
        } finally {
            setLoadingCourses(false);
        }
    };

    const handleDetailModalClose = () => {
        setIsDetailModalVisible(false);
        setSelectedCourse(null);
    };

    const showRegisterModal = (course) => {
        setSelectedCourse(course);
        form.setFieldsValue({
            fullName: user?.name,
            email: user?.email,
            phoneNumber: '',
            notes: '',
        });
        setIsRegisterModalVisible(true);
    };

    const handleRegister = async (values) => {
        setLoadingRegister(true);
        const token = localStorage.getItem('token');
        if (!token || !selectedCourse) {
            message.error('Có lỗi xảy ra, vui lòng thử lại.');
            setLoadingRegister(false);
            return;
        }
        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            };
            const payload = {
                phoneNumber: values.phoneNumber,
                email: values.email,
                fullName: values.fullName,
                notes: values.notes,
            };
            await axios.post(`${API_URL}/training-courses/${selectedCourse._id}/register`, payload, config);
            message.success('Đăng ký khóa học thành công! Vui lòng chờ admin duyệt.');
            setIsRegisterModalVisible(false);
            form.resetFields();
            fetchUserRegistrations();
        } catch (error) {
            console.error('Lỗi khi đăng ký khóa học:', error);
            message.error(error.response?.data?.message || 'Đăng ký khóa học thất bại.');
        } finally {
            setLoadingRegister(false);
        }
    };

    const getRegistrationStatusTag = (status) => {
        switch (status) {
            case 'pending':
                return <Tag color="gold" className="rounded-full">Đang chờ duyệt</Tag>;
            case 'approved':
                return <Tag color="green" className="rounded-full">Đã được duyệt</Tag>;
            case 'rejected':
                return <Tag color="red" className="rounded-full">Đã từ chối</Tag>;
            default:
                return <Tag>Không xác định</Tag>;
        }
    };

    if (authLoading) {
        return (
            <SBNV>
                <div className="flex items-center justify-center h-full min-h-screen">
                    <Spin size="large" tip="Đang tải..." />
                </div>
            </SBNV>
        );
    }

    if (!user) {
        return (
            <SBNV>
                <div className="flex items-center justify-center h-full text-2xl text-red-600">
                    Bạn cần đăng nhập để xem các khóa đào tạo.
                </div>
            </SBNV>
        );
    }

    return (
        <SBNV>
            <div className="flex flex-col items-center flex-1 min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 p-6 font-sans">
                <div className="text-center mb-8">
                    <Title level={1} className="!text-blue-800 !font-bold drop-shadow-sm flex items-center justify-center">
                        <BookOpen size={48} className="mr-4 text-blue-600" />
                        Khóa Đào Tạo
                    </Title>
                    <Text className="text-lg text-gray-700">
                        Chào mừng <span className="text-sky-600 font-bold">{user.name}</span>! Khám phá các khóa học hấp dẫn.
                    </Text>
                </div>

                <Card
                    className="w-full max-w-6xl shadow-2xl rounded-2xl bg-white/95 p-8 mb-12"
                    bordered={false}
                    title={<span className="text-xl font-semibold text-gray-800">Các Khóa Học Hiện Có</span>}
                >
                    {loadingCourses ? (
                        <div className="flex items-center justify-center py-8">
                            <Spin size="large" tip="Đang tải danh sách khóa học..." />
                        </div>
                    ) : courses.length > 0 ? (
                        <Row gutter={[24, 24]}>
                            {courses.map(course => (
                                <Col xs={24} sm={12} md={8} key={course._id}>
                                    <Card
                                        hoverable
                                        className="rounded-xl shadow-md overflow-hidden h-full flex flex-col transition-transform transform hover:scale-105"
                                        cover={
                                            <img
                                                alt={course.title}
                                                src={course.imageUrl || `https://placehold.co/400x200/ADD8E6/000000?text=${encodeURIComponent(course.title)}`}
                                                className="w-full h-48 object-cover"
                                                onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/400x200/ADD8E6/000000?text=${encodeURIComponent(course.title)}`; }}
                                            />
                                        }
                                    >
                                        <Card.Meta
                                            title={<h3 className="text-xl font-bold text-gray-800">{course.title}</h3>}
                                            description={
                                                <>
                                                    <p className="text-gray-600 text-sm mb-2">
                                                        {course.overview.length > 100
                                                            ? `${course.overview.substring(0, 100)}...`
                                                            : course.overview}
                                                    </p>
                                                    <div className="flex items-center text-gray-500 text-xs mb-1">
                                                        <User size={14} className="mr-1" />
                                                        Người tạo: {course.createdBy?.name || 'N/A'}
                                                    </div>
                                                    <div className="flex items-center text-gray-500 text-xs">
                                                        <User size={14} className="mr-1" />
                                                        Phụ trách chính: {course.mainInCharge?.name || 'N/A'}
                                                    </div>
                                                </>
                                            }
                                        />
                                        <div className="mt-4 flex justify-between items-center">
                                            <Button
                                                type="default"
                                                onClick={() => showDetailModal(course._id)}
                                                className="rounded-lg border-blue-600 text-blue-600 hover:text-blue-700 hover:border-blue-700"
                                            >
                                                Xem chi tiết
                                            </Button>
                                            <Button
                                                type="primary"
                                                onClick={() => showRegisterModal(course)}
                                                className="bg-green-600 hover:bg-green-700 rounded-lg"
                                            >
                                                Đăng ký
                                            </Button>
                                        </div>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    ) : (
                        <Empty description="Không có khóa đào tạo nào hiện có." />
                    )}
                </Card>

                <Card
                    className="w-full max-w-6xl shadow-2xl rounded-2xl bg-white/95 p-8"
                    bordered={false}
                    title={<span className="text-xl font-semibold text-gray-800">Lịch Sử Đăng Ký Của Bạn</span>}
                >
                    {loadingUserRegistrations ? (
                        <div className="flex items-center justify-center py-8">
                            <Spin size="large" tip="Đang tải lịch sử đăng ký..." />
                        </div>
                    ) : userRegistrations.length > 0 ? (
                        <div className="space-y-4">
                            {userRegistrations.map(reg => (
                                <Card key={reg._id} className="rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-gray-800">{reg.course?.title || 'Khóa học không tồn tại'}</h3>
                                            <p className="text-sm text-gray-600">Đăng ký vào: {format(new Date(reg.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}</p>
                                            <div className="flex items-center text-gray-500 text-xs mt-1">
                                                <User size={14} className="mr-1" />
                                                Người tạo khóa học: {reg.course?.createdBy?.name || 'N/A'}
                                            </div>
                                            <div className="flex items-center text-gray-500 text-xs">
                                                <User size={14} className="mr-1" />
                                                Phụ trách chính: {reg.course?.mainInCharge?.name || 'N/A'}
                                            </div>
                                        </div>
                                        <div className="mt-2 md:mt-0">
                                            {getRegistrationStatusTag(reg.status)}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Empty description="Bạn chưa đăng ký khóa học nào." />
                    )}
                </Card>
            </div>

            <Modal
                title={<Title level={3} className="!mb-0">Chi tiết khóa học</Title>}
                open={isDetailModalVisible}
                onCancel={handleDetailModalClose}
                footer={[
                    <Button key="back" onClick={handleDetailModalClose} className="rounded-lg">
                        Đóng
                    </Button>,
                    <Button
                        key="register"
                        type="primary"
                        onClick={() => {
                            handleDetailModalClose();
                            showRegisterModal(selectedCourse);
                        }}
                        className="bg-green-600 hover:bg-green-700 rounded-lg"
                    >
                        Đăng ký ngay
                    </Button>,
                ]}
                width={800}
            >
                {selectedCourse ? (
                    <div className="p-4">
                        {selectedCourse.imageUrl && (
                            <img
                                src={selectedCourse.imageUrl}
                                alt={selectedCourse.title}
                                className="w-full h-64 object-cover rounded-lg mb-4"
                                onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/600x300/ADD8E6/000000?text=${encodeURIComponent(selectedCourse.title)}`; }}
                            />
                        )}
                        <h3 className="text-2xl font-semibold text-gray-800 mb-2">{selectedCourse.title}</h3>
                        <div className="space-y-2 mb-4">
                            <div className="flex items-center text-gray-600">
                                <User size={16} className="mr-2 text-blue-500" />
                                <span className="font-medium">Người tạo:</span> {selectedCourse.createdBy?.name || 'N/A'}
                            </div>
                            <div className="flex items-center text-gray-600">
                                <User size={16} className="mr-2 text-blue-500" />
                                <span className="font-medium">Phụ trách chính:</span> {selectedCourse.mainInCharge?.name || 'N/A'}
                            </div>
                            <div className="flex items-center text-gray-600">
                                <Calendar size={16} className="mr-2 text-blue-500" />
                                <span className="font-medium">Thời gian chi tiết:</span> {selectedCourse.detailedTime}
                            </div>
                        </div>
                        <div className="bg-gray-100 p-4 rounded-lg">
                            <Text strong className="text-lg text-gray-800">Nội dung:</Text>
                            <p className="text-gray-700 mt-2 whitespace-pre-wrap">{selectedCourse.content}</p>
                        </div>
                    </div>
                ) : (
                    <Spin tip="Đang tải chi tiết khóa học..." />
                )}
            </Modal>

            <Modal
                title={<Title level={3} className="!mb-0">Đăng ký khóa học</Title>}
                open={isRegisterModalVisible}
                onCancel={() => setIsRegisterModalVisible(false)}
                footer={null}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleRegister}
                    className="mt-4"
                >
                    <Form.Item
                        name="fullName"
                        label="Họ và tên"
                        rules={[{ required: true, message: 'Vui lòng nhập họ và tên của bạn!' }]}
                    >
                        <Input prefix={<User size={16} />} placeholder="Nhập họ và tên" />
                    </Form.Item>
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[{ required: true, message: 'Vui lòng nhập email của bạn!' }, { type: 'email', message: 'Email không hợp lệ!' }]}
                    >
                        <Input prefix={<Mail size={16} />} placeholder="Nhập email" />
                    </Form.Item>
                    <Form.Item
                        name="phoneNumber"
                        label="Số điện thoại"
                        rules={[{ required: true, message: 'Vui lòng nhập số điện thoại của bạn!' }, { pattern: /^[0-9]+$/, message: 'Số điện thoại chỉ được chứa số!' }]}
                    >
                        <Input prefix={<Phone size={16} />} placeholder="Nhập số điện thoại" />
                    </Form.Item>
                    <Form.Item
                        name="notes"
                        label="Ghi chú (tùy chọn)"
                    >
                        <TextArea rows={3} placeholder="Ghi chú thêm về việc đăng ký của bạn..." />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loadingRegister} icon={<CheckCircle size={16} />} className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg">
                            Gửi đăng ký
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </SBNV>
    );
};

export default KhoaHoc;