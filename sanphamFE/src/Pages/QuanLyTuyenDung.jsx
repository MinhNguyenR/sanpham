import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv';
import { Button, message, Spin, Table, Modal, Form, Input, Select, DatePicker, Popconfirm, Tag, InputNumber, Tabs } from 'antd';
import { PlusCircle, Trash2, Edit2, Briefcase, FileText, Calendar, User, Info, MailOpen } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import moment from 'moment'; 
import { io } from 'socket.io-client'; 

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

const API_URL = 'http://localhost:5000/api/auth/recruitment';
const SOCKET_URL = 'http://localhost:5000'; 

let socket; 

const QuanLyTuyenDung = () => {
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [jobPostings, setJobPostings] = useState([]);
    const [applications, setApplications] = useState([]);
    const [isJobModalVisible, setIsJobModalVisible] = useState(false);
    const [isApplicationModalVisible, setIsApplicationModalVisible] = useState(false);
    const [editingJob, setEditingJob] = useState(null); 
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [jobForm] = Form.useForm();
    const [applicationForm] = Form.useForm();
    const [activeTab, setActiveTab] = useState('jobPostings'); 

    const isAdmin = user && user.role === 'admin';

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            message.error("Bạn không có quyền truy cập trang này.");
        }
    }, [authLoading, isAdmin]);


    const fetchJobPostings = useCallback(async () => {
        if (!isAdmin || authLoading) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`${API_URL}/job-postings/admin`, config);
            setJobPostings(res.data.jobPostings);
        } catch (error) {
            message.error('Lỗi khi tải vị trí tuyển dụng.');
            console.error('Error fetching job postings:', error.response ? error.response.data : error.message);
            setJobPostings([]);
        } finally {
            setLoading(false);
        }
    }, [isAdmin, authLoading]);

    const fetchApplications = useCallback(async () => {
        if (!isAdmin || authLoading) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`${API_URL}/applications/admin`, config);
            setApplications(res.data.applications);
        } catch (error) {
            message.error('Lỗi khi tải đơn ứng tuyển.');
            console.error('Error fetching applications:', error.response ? error.response.data : error.message);
            setApplications([]);
        } finally {
            setLoading(false);
        }
    }, [isAdmin, authLoading]);

    useEffect(() => {
        if (activeTab === 'jobPostings') {
            fetchJobPostings();
        } else {
            fetchApplications();
        }
    }, [activeTab, fetchJobPostings, fetchApplications]);

    useEffect(() => {
        if (!socket && user && !authLoading && isAdmin) {
            socket = io(SOCKET_URL, {
                auth: { token: localStorage.getItem('token') },
                transports: ['websocket', 'polling']
            });

            socket.on('connect', () => {
                console.log('Socket.IO connected from QuanLyTuyenDung.jsx');
                socket.emit('joinRoom', user._id); // Tham gia phòng của admin
            });

            // Lắng nghe thông báo vị trí tuyển dụng mới/cập nhật/đóng
            socket.on('new_job_posting', (notification) => {
                message.info(`Thông báo: ${notification.message}`);
                if (activeTab === 'jobPostings') fetchJobPostings(); // Cập nhật nếu đang ở tab vị trí
            });
            socket.on('job_posting_updated', (notification) => {
                message.info(`Thông báo: ${notification.message}`);
                if (activeTab === 'jobPostings') fetchJobPostings();
            });
            socket.on('job_posting_closed', (notification) => {
                message.info(`Thông báo: ${notification.message}`);
                if (activeTab === 'jobPostings') fetchJobPostings();
            });

            // Lắng nghe thông báo đơn ứng tuyển mới/cập nhật trạng thái
            socket.on('new_application', (notification) => {
                message.info(`Thông báo: ${notification.message}`);
                if (activeTab === 'applications') fetchApplications(); // Cập nhật nếu đang ở tab đơn ứng tuyển
            });
            socket.on('application_status_updated', (notification) => {
                message.info(`Thông báo: ${notification.message}`);
                if (activeTab === 'applications') fetchApplications();
            });

            socket.on('disconnect', () => {
                console.log('Socket.IO disconnected from QuanLyTuyenDung.jsx');
            });

            socket.on('connect_error', (err) => {
                console.error('Socket.IO connection error from QuanLyTuyenDung.jsx:', err.message);
            });
        } else if (socket && user && !authLoading && isAdmin) {
            socket.emit('joinRoom', user._id);
        }

        return () => {
            if (socket) {
                socket.disconnect(); // Ngắt kết nối socket khi component unmount
                socket = null;
            }
        };
    }, [user, authLoading, isAdmin, activeTab, fetchJobPostings, fetchApplications]);

    const handleAddJob = () => {
        setEditingJob(null);
        jobForm.resetFields();
        jobForm.setFieldsValue({
            employmentType: 'full-time',
            experienceLevel: 'entry',
            status: 'open',
            salaryRange: { min: 0, max: 0 }
        });
        setIsJobModalVisible(true);
    };

    const handleEditJob = (job) => {
        setEditingJob(job);
        jobForm.setFieldsValue({
            ...job,
            applicationDeadline: job.applicationDeadline ? moment(job.applicationDeadline) : null,
            requirements: job.requirements.join('\n'), // Chuyển mảng thành chuỗi để hiển thị trong TextArea
            responsibilities: job.responsibilities.join('\n'),
        });
        setIsJobModalVisible(true);
    };

    const handleSubmitJob = async (values) => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const payload = {
                ...values,
                applicationDeadline: values.applicationDeadline ? values.applicationDeadline.format('YYYY-MM-DD') : null,
                requirements: values.requirements.split('\n').map(item => item.trim()).filter(item => item), // Chuyển chuỗi thành mảng
                responsibilities: values.responsibilities.split('\n').map(item => item.trim()).filter(item => item),
            };

            if (editingJob) {
                await axios.put(`${API_URL}/job-postings/${editingJob._id}`, payload, config);
                message.success('Cập nhật vị trí tuyển dụng thành công!');
            } else {
                await axios.post(`${API_URL}/job-postings`, payload, config);
                message.success('Thêm vị trí tuyển dụng thành công!');
            }
            setIsJobModalVisible(false);
            fetchJobPostings(); // Tải lại dữ liệu
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi khi lưu vị trí tuyển dụng.');
            console.error('Error saving job posting:', error.response ? error.response.data : error.message);
        }
    };

    const handleDeleteJob = async (jobId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/job-postings/${jobId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Xóa vị trí tuyển dụng thành công!');
            fetchJobPostings(); // Tải lại dữ liệu
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi khi xóa vị trí tuyển dụng.');
            console.error('Error deleting job posting:', error.response ? error.response.data : error.message);
        }
    };

    const handleViewApplicationDetails = (application) => {
        setSelectedApplication(application);
        applicationForm.setFieldsValue({
            status: application.status,
            notes: application.notes,
            interviewDate: application.interviewDate ? moment(application.interviewDate) : null,
            interviewFeedback: application.interviewFeedback,
        });
        setIsApplicationModalVisible(true);
    };

    const handleUpdateApplicationStatus = async (values) => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const payload = {
                ...values,
                interviewDate: values.interviewDate ? values.interviewDate.format('YYYY-MM-DDTHH:mm:ss.SSSZ') : null, // Format ISO string
            };
            await axios.put(`${API_URL}/applications/${selectedApplication._id}/status`, payload, config);
            message.success('Cập nhật trạng thái đơn ứng tuyển thành công!');
            setIsApplicationModalVisible(false);
            fetchApplications(); // Tải lại dữ liệu
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi khi cập nhật trạng thái đơn ứng tuyển.');
            console.error('Error updating application status:', error.response ? error.response.data : error.message);
        }
    };

    const handleDeleteApplication = async (applicationId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/applications/${applicationId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Xóa đơn ứng tuyển thành công!');
            fetchApplications(); // Tải lại dữ liệu
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi khi xóa đơn ứng tuyển.');
            console.error('Error deleting application:', error.response ? error.response.data : error.message);
        }
    };


    const getEmploymentTypeColor = (type) => {
        switch (type) {
            case 'full-time': return 'blue';
            case 'part-time': return 'green';
            case 'contract': return 'purple';
            case 'internship': return 'orange';
            default: return 'default';
        }
    };

    const getExperienceLevelColor = (level) => {
        switch (level) {
            case 'entry': return 'cyan';
            case 'junior': return 'geekblue';
            case 'mid': return 'volcano';
            case 'senior': return 'gold';
            case 'lead': return 'magenta';
            case 'manager': return 'red';
            case 'executive': return 'lime';
            default: return 'default';
        }
    };

    const getApplicationStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'blue';
            case 'reviewed': return 'cyan';
            case 'interview_scheduled': return 'geekblue';
            case 'offered': return 'gold';
            case 'rejected': return 'red';
            case 'hired': return 'green';
            case 'withdrawn': return 'default';
            default: return 'default';
        }
    };

    const jobColumns = [
        { title: 'Tiêu đề', dataIndex: 'title', key: 'title' },
        { title: 'Phòng ban', dataIndex: 'department', key: 'department' },
        { title: 'Địa điểm', dataIndex: 'location', key: 'location' },
        {
            title: 'Hạn chót',
            dataIndex: 'applicationDeadline',
            key: 'applicationDeadline',
            render: (date) => format(new Date(date), 'dd/MM/yyyy', { locale: vi }),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={status === 'open' ? 'green' : 'red'}>
                    {status.toUpperCase()}
                </Tag>
            ),
        },
        {
            title: 'Người tạo',
            dataIndex: 'createdBy',
            key: 'createdBy',
            render: (createdBy) => createdBy ? createdBy.name : 'N/A',
        },
        {
            title: 'Hành động',
            key: 'actions',
            render: (_, record) => (
                <>
                    <Button
                        icon={<Edit2 size={16} />}
                        onClick={() => handleEditJob(record)}
                        className="mr-2"
                    >
                        Sửa
                    </Button>
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xóa vị trí này?"
                        onConfirm={() => handleDeleteJob(record._id)}
                        okText="Có"
                        cancelText="Không"
                    >
                        <Button danger icon={<Trash2 size={16} />}>
                            Xóa
                        </Button>
                    </Popconfirm>
                </>
            ),
        },
    ];

    const applicationColumns = [
        {
            title: 'Vị trí ứng tuyển',
            dataIndex: 'jobPosting',
            key: 'jobPosting',
            render: (jobPosting) => jobPosting?.title || 'N/A',
        },
        {
            title: 'Người ứng tuyển',
            dataIndex: 'applicant',
            key: 'applicant',
            render: (applicant) => `${applicant?.name} (${applicant?.email})` || 'N/A',
        },
        {
            title: 'Ngày nộp đơn',
            dataIndex: 'applicationDate',
            key: 'applicationDate',
            render: (date) => format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: vi }),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={getApplicationStatusColor(status)}>
                    {status.replace(/_/g, ' ').toUpperCase()}
                </Tag>
            ),
        },
        {
            title: 'Hành động',
            key: 'actions',
            render: (_, record) => (
                <>
                    <Button
                        icon={<Info size={16} />}
                        onClick={() => handleViewApplicationDetails(record)}
                        className="mr-2"
                    >
                        Chi tiết / Cập nhật
                    </Button>
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xóa đơn ứng tuyển này?"
                        onConfirm={() => handleDeleteApplication(record._id)}
                        okText="Có"
                        cancelText="Không"
                    >
                        <Button danger icon={<Trash2 size={16} />}>
                            Xóa
                        </Button>
                    </Popconfirm>
                </>
            ),
        },
    ];

    if (authLoading || loading) {
        return <Spin tip="Đang tải dữ liệu..." size="large" className="flex justify-center items-center h-screen" />;
    }

    if (!isAdmin) {
        return (
            <SBNV>
                <div className="container mx-auto p-4 text-center text-red-500">
                    Bạn không có quyền truy cập trang này.
                </div>
            </SBNV>
        );
    }

    return (
        <SBNV>
            <div className="container mx-auto p-4">
                <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
                    <Briefcase size={32} className="mr-3" /> Quản lý Tuyển dụng & Thăng tiến
                </h1>

                <Tabs activeKey={activeTab} onChange={setActiveTab} className="mb-6">
                    <TabPane tab="Vị trí Tuyển dụng" key="jobPostings">
                        <Button
                            type="primary"
                            icon={<PlusCircle size={18} />}
                            onClick={handleAddJob}
                            className="mb-4 bg-green-500 hover:bg-green-600"
                        >
                            Thêm Vị trí Tuyển dụng Mới
                        </Button>
                        <Table
                            columns={jobColumns}
                            dataSource={jobPostings}
                            rowKey="_id"
                            loading={loading}
                            pagination={{ pageSize: 10 }}
                        />
                    </TabPane>
                    <TabPane tab="Đơn ứng tuyển" key="applications">
                        <Table
                            columns={applicationColumns}
                            dataSource={applications}
                            rowKey="_id"
                            loading={loading}
                            pagination={{ pageSize: 10 }}
                        />
                    </TabPane>
                </Tabs>

                {/* Modal Thêm/Sửa Vị trí Tuyển dụng */}
                <Modal
                    title={editingJob ? "Chỉnh sửa Vị trí Tuyển dụng" : "Thêm Vị trí Tuyển dụng Mới"}
                    visible={isJobModalVisible}
                    onCancel={() => setIsJobModalVisible(false)}
                    footer={null}
                    width={800}
                >
                    <Form form={jobForm} layout="vertical" onFinish={handleSubmitJob}>
                        <Form.Item
                            name="title"
                            label="Tiêu đề vị trí"
                            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề vị trí!' }]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            name="description"
                            label="Mô tả công việc"
                            rules={[{ required: true, message: 'Vui lòng nhập mô tả công việc!' }]}
                        >
                            <TextArea rows={4} />
                        </Form.Item>
                        <Form.Item
                            name="requirements"
                            label="Yêu cầu (mỗi yêu cầu một dòng)"
                            rules={[{ required: true, message: 'Vui lòng nhập các yêu cầu!' }]}
                        >
                            <TextArea rows={4} placeholder="Ví dụ:&#10;- Có kinh nghiệm 2 năm&#10;- Tốt nghiệp đại học..." />
                        </Form.Item>
                        <Form.Item
                            name="responsibilities"
                            label="Trách nhiệm (mỗi trách nhiệm một dòng)"
                            rules={[{ required: true, message: 'Vui lòng nhập các trách nhiệm!' }]}
                        >
                            <TextArea rows={4} placeholder="Ví dụ:&#10;- Quản lý dự án X&#10;- Báo cáo hàng tuần..." />
                        </Form.Item>
                        <Form.Item
                            name="location"
                            label="Địa điểm làm việc"
                            rules={[{ required: true, message: 'Vui lòng nhập địa điểm!' }]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            name="department"
                            label="Phòng ban"
                            rules={[{ required: true, message: 'Vui lòng nhập phòng ban!' }]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item label="Mức lương (VND)">
                            <Input.Group compact>
                                <Form.Item name={['salaryRange', 'min']} noStyle>
                                    <InputNumber
                                        min={0}
                                        formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                        parser={value => value.replace(/,*/g, '')}
                                        placeholder="Min"
                                        style={{ width: 'calc(50% - 8px)' }}
                                    />
                                </Form.Item>
                                <Input
                                    className="site-input-split"
                                    style={{ width: '16px', borderLeft: 0, borderRight: 0, pointerEvents: 'none' }}
                                    placeholder="-"
                                    disabled
                                />
                                <Form.Item name={['salaryRange', 'max']} noStyle>
                                    <InputNumber
                                        min={0}
                                        formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                        parser={value => value.replace(/,*/g, '')}
                                        placeholder="Max"
                                        style={{ width: 'calc(50% - 8px)' }}
                                    />
                                </Form.Item>
                            </Input.Group>
                        </Form.Item>
                        <Form.Item
                            name="employmentType"
                            label="Loại hình làm việc"
                            rules={[{ required: true, message: 'Vui lòng chọn loại hình!' }]}
                        >
                            <Select>
                                <Option value="full-time">Toàn thời gian</Option>
                                <Option value="part-time">Bán thời gian</Option>
                                <Option value="contract">Hợp đồng</Option>
                                <Option value="internship">Thực tập</Option>
                                <Option value="other">Khác</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item
                            name="experienceLevel"
                            label="Cấp độ kinh nghiệm"
                            rules={[{ required: true, message: 'Vui lòng chọn cấp độ!' }]}
                        >
                            <Select>
                                <Option value="entry">Mới vào</Option>
                                <Option value="junior">Junior</Option>
                                <Option value="mid">Mid-level</Option>
                                <Option value="senior">Senior</Option>
                                <Option value="lead">Trưởng nhóm</Option>
                                <Option value="manager">Quản lý</Option>
                                <Option value="executive">Giám đốc điều hành</Option>
                                <Option value="none">Không yêu cầu</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item
                            name="applicationDeadline"
                            label="Hạn chót nộp hồ sơ"
                            rules={[{ required: true, message: 'Vui lòng chọn hạn chót!' }]}
                        >
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" showToday={false} />
                        </Form.Item>
                        {editingJob && ( // Chỉ hiển thị trạng thái khi chỉnh sửa
                            <Form.Item
                                name="status"
                                label="Trạng thái"
                                rules={[{ required: true, message: 'Vui lòng chọn trạng thái!' }]}
                            >
                                <Select>
                                    <Option value="open">Đang mở</Option>
                                    <Option value="closed">Đã đóng</Option>
                                    <Option value="filled">Đã tuyển dụng</Option>
                                </Select>
                            </Form.Item>
                        )}
                        <Form.Item>
                            <Button type="primary" htmlType="submit" className="bg-blue-600 hover:bg-blue-700 mr-2">
                                {editingJob ? "Cập nhật" : "Thêm mới"}
                            </Button>
                            <Button onClick={() => setIsJobModalVisible(false)}>
                                Hủy
                            </Button>
                        </Form.Item>
                    </Form>
                </Modal>

                {/* Modal Chi tiết/Cập nhật Đơn ứng tuyển */}
                <Modal
                    title="Chi tiết & Cập nhật Đơn ứng tuyển"
                    visible={isApplicationModalVisible}
                    onCancel={() => setIsApplicationModalVisible(false)}
                    footer={null}
                    width={800}
                >
                    {selectedApplication && (
                        <Form form={applicationForm} layout="vertical" onFinish={handleUpdateApplicationStatus}>
                            <p className="mb-2"><strong>Vị trí:</strong> {selectedApplication.jobPosting?.title}</p>
                            <p className="mb-2"><strong>Người ứng tuyển:</strong> {selectedApplication.applicant?.name} ({selectedApplication.applicant?.email})</p>
                            <p className="mb-4"><strong>Ngày nộp:</strong> {format(new Date(selectedApplication.applicationDate), 'dd/MM/yyyy HH:mm', { locale: vi })}</p>

                            {selectedApplication.resumeUrl && (
                                <p className="mb-2"><strong>CV/Hồ sơ:</strong> <a href={selectedApplication.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Xem CV</a></p>
                            )}
                            {selectedApplication.coverLetter && (
                                <p className="mb-4"><strong>Thư xin việc:</strong> {selectedApplication.coverLetter}</p>
                            )}

                            <Form.Item
                                name="status"
                                label="Cập nhật trạng thái"
                                rules={[{ required: true, message: 'Vui lòng chọn trạng thái!' }]}
                            >
                                <Select placeholder="Chọn trạng thái">
                                    <Option value="pending">Đang chờ</Option>
                                    <Option value="reviewed">Đã xem xét</Option>
                                    <Option value="interview_scheduled">Lịch phỏng vấn</Option>
                                    <Option value="offered">Đã đề nghị</Option>
                                    <Option value="rejected">Đã từ chối</Option>
                                    <Option value="hired">Đã tuyển dụng</Option>
                                    <Option value="withdrawn">Đã rút đơn</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item
                                name="interviewDate"
                                label="Ngày phỏng vấn (nếu có)"
                            >
                                <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
                            </Form.Item>
                            <Form.Item
                                name="interviewFeedback"
                                label="Phản hồi phỏng vấn (nếu có)"
                            >
                                <TextArea rows={3} />
                            </Form.Item>
                            <Form.Item
                                name="notes"
                                label="Ghi chú nội bộ (Admin)"
                            >
                                <TextArea rows={3} />
                            </Form.Item>
                            <Form.Item>
                                <Button type="primary" htmlType="submit" className="bg-blue-600 hover:bg-blue-700 mr-2">
                                    Cập nhật
                                </Button>
                                <Button onClick={() => setIsApplicationModalVisible(false)}>
                                    Hủy
                                </Button>
                            </Form.Item>
                        </Form>
                    )}
                </Modal>
            </div>
        </SBNV>
    );
};

export default QuanLyTuyenDung;
