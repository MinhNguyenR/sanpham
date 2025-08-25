import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv';
import { message, Spin, Card, Tag, Button, Modal, Form, Input, InputNumber, Select, DatePicker } from 'antd';
import { Briefcase, MapPin, DollarSign, Calendar, Clock, Award, FileText, Send, UserCheck } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import moment from 'moment'; 

const { Option } = Select;
const { TextArea } = Input;

const API_URL = 'http://localhost:5000/api/auth/recruitment';

const TuyenDung = () => {
    const { user, loading: authLoading } = useAuth();
    const [loadingJobPostings, setLoadingJobPostings] = useState(true);
    const [jobPostings, setJobPostings] = useState([]);
    const [isApplyModalVisible, setIsApplyModalVisible] = useState(false);
    const [selectedJobPosting, setSelectedJobPosting] = useState(null);
    const [form] = Form.useForm();

    const fetchOpenJobPostings = useCallback(async () => {
        if (authLoading) return;
        setLoadingJobPostings(true);
        try {
            const token = localStorage.getItem('token');
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };
            const res = await axios.get(`${API_URL}/job-postings/open`, config);
            setJobPostings(res.data.jobPostings);
        } catch (error) {
            message.error('Lỗi khi tải các vị trí tuyển dụng.');
            console.error('Error fetching open job postings:', error.response ? error.response.data : error.message);
            setJobPostings([]);
        } finally {
            setLoadingJobPostings(false);
        }
    }, [authLoading]);

    useEffect(() => {
        fetchOpenJobPostings();
    }, [fetchOpenJobPostings]);

    const handleApplyClick = (jobPosting) => {
        setSelectedJobPosting(jobPosting);
        form.resetFields();
        setIsApplyModalVisible(true);
    };

    const handleSubmitApplication = async (values) => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const payload = {
                jobPostingId: selectedJobPosting._id,
                resumeUrl: values.resumeUrl, 
                coverLetter: values.coverLetter,
            };
            await axios.post(`${API_URL}/applications`, payload, config);
            message.success('Đã nộp đơn ứng tuyển thành công!');
            setIsApplyModalVisible(false);
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi khi nộp đơn ứng tuyển.');
            console.error('Error submitting application:', error.response ? error.response.data : error.message);
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

    if (authLoading || loadingJobPostings) {
        return <Spin tip="Đang tải vị trí tuyển dụng..." size="large" className="flex justify-center items-center h-screen" />;
    }

    return (
        <SBNV>
            <div className="container mx-auto p-4">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-8 text-center flex items-center justify-center">
                    <Briefcase size={40} className="mr-4 text-blue-600" /> Vị trí Tuyển dụng đang mở
                </h1>

                {jobPostings.length === 0 ? (
                    <div className="text-center text-gray-600 p-8 bg-white rounded-lg shadow-md max-w-2xl mx-auto">
                        <p className="text-lg">Hiện chưa có vị trí tuyển dụng nào đang mở.</p>
                        <p className="text-md mt-2">Vui lòng quay lại sau hoặc liên hệ bộ phận HR để biết thêm chi tiết.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {jobPostings.map(job => (
                            <Card
                                key={job._id}
                                className="shadow-lg rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200"
                                title={
                                    <div className="flex items-center text-blue-700 font-bold text-xl py-2">
                                        <Briefcase size={24} className="mr-3" />
                                        <span className="truncate">{job.title}</span>
                                    </div>
                                }
                                headStyle={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}
                                bodyStyle={{ padding: '24px' }}
                            >
                                <p className="text-gray-700 mb-4 text-base line-clamp-3">{job.description}</p>
                                <div className="mb-4 flex flex-wrap gap-2">
                                    <Tag icon={<MapPin size={14} />} color="blue" className="px-3 py-1 rounded-full text-sm">
                                        {job.location}
                                    </Tag>
                                    <Tag color="purple" className="px-3 py-1 rounded-full text-sm">
                                        {job.department}
                                    </Tag>
                                    <Tag color={getEmploymentTypeColor(job.employmentType)} className="px-3 py-1 rounded-full text-sm">
                                        {job.employmentType.replace(/-/g, ' ').toUpperCase()}
                                    </Tag>
                                    <Tag color={getExperienceLevelColor(job.experienceLevel)} className="px-3 py-1 rounded-full text-sm">
                                        {job.experienceLevel.toUpperCase()}
                                    </Tag>
                                </div>
                                {(job.salaryRange && (job.salaryRange.min > 0 || job.salaryRange.max > 0)) && (
                                    <p className="flex items-center text-green-700 font-semibold mb-2 text-lg">
                                        <DollarSign size={20} className="mr-2" />
                                        {job.salaryRange.min.toLocaleString('vi-VN')} - {job.salaryRange.max.toLocaleString('vi-VN')} VND
                                    </p>
                                )}
                                <p className="flex items-center text-gray-600 text-sm mb-4">
                                    <Calendar size={16} className="mr-2" />
                                    Hạn chót: <span className="font-medium ml-1">{format(new Date(job.applicationDeadline), 'dd/MM/yyyy', { locale: vi })}</span>
                                </p>

                                <div className="mb-4">
                                    <h4 className="font-semibold text-gray-800 mb-2">Yêu cầu:</h4>
                                    <ul className="list-disc list-inside text-gray-700 text-sm pl-4">
                                        {job.requirements.map((req, index) => (
                                            <li key={index}>{req}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="mb-4">
                                    <h4 className="font-semibold text-gray-800 mb-2">Trách nhiệm:</h4>
                                    <ul className="list-disc list-inside text-gray-700 text-sm pl-4">
                                        {job.responsibilities.map((resp, index) => (
                                            <li key={index}>{resp}</li>
                                        ))}
                                    </ul>
                                </div>

                                <Button
                                    type="primary"
                                    icon={<FileText size={18} />}
                                    onClick={() => handleApplyClick(job)}
                                    className="mt-4 bg-blue-600 hover:bg-blue-700 w-full text-lg font-semibold py-2 h-auto rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                    Nộp đơn ứng tuyển
                                </Button>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Nộp đơn ứng tuyển */}
            <Modal
                title={<span className="text-2xl font-bold text-gray-800">Nộp đơn cho vị trí: <span className="text-blue-600">{selectedJobPosting?.title}</span></span>}
                visible={isApplyModalVisible}
                onCancel={() => setIsApplyModalVisible(false)}
                footer={null}
                width={700}
                centered
            >
                <Form form={form} layout="vertical" onFinish={handleSubmitApplication} className="mt-6">
                    <Form.Item
                        label={<span className="font-semibold text-gray-700">Tải lên CV/Hồ sơ (URL)</span>}
                        name="resumeUrl"
                        rules={[{ required: true, message: 'Vui lòng cung cấp URL CV của bạn!' }]}
                    >
                        <Input
                            placeholder="Ví dụ: https://drive.google.com/your-resume.pdf"
                            className="rounded-lg px-4 py-2"
                        />
                    </Form.Item>
                    <Form.Item
                        label={<span className="font-semibold text-gray-700">Thư xin việc (Tùy chọn)</span>}
                        name="coverLetter"
                    >
                        <TextArea
                            rows={6}
                            placeholder="Viết thư xin việc của bạn tại đây... (tối đa 500 ký tự)"
                            maxLength={500}
                            showCount
                            className="rounded-lg px-4 py-2"
                        />
                    </Form.Item>
                    <Form.Item className="text-right mt-6">
                        <Button
                            onClick={() => setIsApplyModalVisible(false)}
                            className="mr-3 px-6 py-2 h-auto rounded-lg text-gray-700 border-gray-300 hover:border-gray-500 hover:text-gray-900 transition-all duration-200"
                        >
                            Hủy
                        </Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            icon={<Send size={18} />}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 h-auto rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                        >
                            Gửi đơn
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </SBNV>
    );
};

export default TuyenDung;
