import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv';
import { message, Spin, Table, Tag, Empty, Button, Modal, Card, Typography } from 'antd';
import { FileText, Briefcase, Calendar, Info, MailOpen, Clock } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { io } from 'socket.io-client';

const { Title, Text } = Typography;

const API_URL = 'http://localhost:5000/api/auth/recruitment';
const SOCKET_URL = 'http://localhost:5000';

let socket;

const DonUngTuyenCuaToi = () => {
    const { user, loading: authLoading } = useAuth();
    const [applications, setApplications] = useState([]);
    const [loadingApplications, setLoadingApplications] = useState(true);
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState(null);

    const fetchMyApplications = useCallback(async () => {
        if (!user || authLoading) {
            setLoadingApplications(false);
            return;
        }
        setLoadingApplications(true);
        try {
            const token = localStorage.getItem('token');
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };
            const res = await axios.get(`${API_URL}/applications/me`, config);
            setApplications(res.data.applications);
        } catch (error) {
            message.error('Lỗi khi tải đơn ứng tuyển của bạn.');
            console.error('Error fetching user applications:', error.response ? error.response.data : error.message);
            setApplications([]);
        } finally {
            setLoadingApplications(false);
        }
    }, [user, authLoading]);

    useEffect(() => {
        fetchMyApplications();

        if (!socket && user && !authLoading) {
            socket = io(SOCKET_URL, {
                auth: { token: localStorage.getItem('token') },
                transports: ['websocket', 'polling']
            });

            socket.on('connect', () => {
                console.log('Socket.IO connected from DonUngTuyenCuaToi.jsx');
                socket.emit('joinRoom', user._id);
            });

            socket.on('application_status_updated', (notification) => {
                console.log('Thông báo trạng thái đơn ứng tuyển mới nhận được:', notification);
                message.info(`Trạng thái đơn ứng tuyển của bạn đã được cập nhật: ${notification.message}`);
                fetchMyApplications();
            });

            socket.on('disconnect', () => {
                console.log('Socket.IO disconnected from DonUngTuyenCuaToi.jsx');
            });

            socket.on('connect_error', (err) => {
                console.error('Socket.IO connection error from DonUngTuyenCuaToi.jsx:', err.message);
            });
        } else if (socket && user && !authLoading) {
            socket.emit('joinRoom', user._id);
        }

        return () => {
            if (socket) {
                socket.disconnect();
                socket = null;
            }
        };
    }, [user, authLoading, fetchMyApplications]);

    const getStatusColor = (status) => {
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

    const handleViewDetails = (application) => {
        setSelectedApplication(application);
        setIsDetailModalVisible(true);
    };

    const columns = [
        {
            title: 'Vị trí ứng tuyển',
            dataIndex: 'jobPosting',
            key: 'jobPosting',
            render: (jobPosting) => jobPosting?.title || 'N/A',
        },
        {
            title: 'Phòng ban',
            dataIndex: 'jobPosting',
            key: 'department',
            render: (jobPosting) => jobPosting?.department || 'N/A',
        },
        {
            title: 'Ngày nộp đơn',
            dataIndex: 'applicationDate',
            key: 'applicationDate',
            render: (date) => format(new Date(date), 'dd/MM/yyyy', { locale: vi }),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={getStatusColor(status)} className="rounded-full">
                    {status.replace(/_/g, ' ').toUpperCase()}
                </Tag>
            ),
        },
        {
            title: 'Hành động',
            key: 'actions',
            render: (_, record) => (
                <Button
                    icon={<Info size={16} />}
                    onClick={() => handleViewDetails(record)}
                    className="rounded-lg border-blue-600 text-blue-600 hover:text-blue-700 hover:border-blue-700"
                >
                    Chi tiết
                </Button>
            ),
        },
    ];

    if (authLoading || loadingApplications) {
        return <Spin tip="Đang tải đơn ứng tuyển..." size="large" className="flex justify-center items-center h-screen" />;
    }

    if (!user) {
        return (
            <SBNV>
                <div className="container mx-auto p-4 text-center text-red-500">
                    Bạn cần đăng nhập để xem đơn ứng tuyển của mình.
                </div>
            </SBNV>
        );
    }

    return (
        <SBNV>
            <div className="flex flex-col items-center flex-1 min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6 font-sans">
                <div className="text-center mb-8">
                    <Title level={1} className="!text-blue-800 !font-bold drop-shadow-sm mb-2">
                        Đơn Ứng Tuyển Của Tôi
                    </Title>
                    <Text className="text-lg text-gray-700">
                        Chào mừng <span className="text-blue-600 font-bold">{user.name}</span>! Xem lại trạng thái hồ sơ của bạn.
                    </Text>
                </div>

                <Card
                    className="w-full max-w-7xl shadow-2xl rounded-3xl bg-white/90 p-8 mb-12"
                    bordered={false}
                >
                    <div className="w-full">
                        {applications.length === 0 ? (
                            <div className="text-center text-gray-600 p-8">
                                <Empty description="Bạn chưa nộp đơn ứng tuyển nào." />
                                <p className="mt-4">Hãy xem các <a href="/tuyendung" className="text-blue-500 hover:underline">vị trí tuyển dụng đang mở</a> để tìm kiếm cơ hội mới!</p>
                            </div>
                        ) : (
                            <Table
                                columns={columns}
                                dataSource={applications}
                                rowKey="_id"
                                loading={loadingApplications}
                                pagination={{ pageSize: 10 }}
                                className="rounded-xl overflow-hidden shadow-lg"
                                scroll={{ x: 'max-content' }}
                            />
                        )}
                    </div>
                </Card>

                <Modal
                    title="Chi tiết đơn ứng tuyển"
                    open={isDetailModalVisible}
                    onCancel={() => setIsDetailModalVisible(false)}
                    footer={[
                        <Button key="close" onClick={() => setIsDetailModalVisible(false)} className="rounded-lg">
                            Đóng
                        </Button>,
                    ]}
                    width={600}
                >
                    {selectedApplication && (
                        <div className="p-4">
                            <h3 className="text-xl font-semibold text-gray-800 mb-4">Thông tin đơn ứng tuyển</h3>
                            <p className="flex items-center mb-2"><Briefcase size={18} className="mr-2 text-blue-500" /> <span className="font-medium">Vị trí:</span>&nbsp;{selectedApplication.jobPosting?.title || 'N/A'}</p>
                            <p className="flex items-center mb-2"><Briefcase size={18} className="mr-2 text-blue-500" /> <span className="font-medium">Phòng ban:</span>&nbsp;{selectedApplication.jobPosting?.department || 'N/A'}</p>
                            <p className="flex items-center mb-2"><Calendar size={18} className="mr-2 text-blue-500" /> <span className="font-medium">Ngày nộp:</span>&nbsp;{format(new Date(selectedApplication.applicationDate), 'dd/MM/yyyy HH:mm', { locale: vi })}</p>
                            <p className="flex items-center mb-4"><Info size={18} className="mr-2 text-blue-500" /> <span className="font-medium">Trạng thái:</span>&nbsp;
                                <Tag color={getStatusColor(selectedApplication.status)} className="rounded-full">
                                    {selectedApplication.status.replace(/_/g, ' ').toUpperCase()}
                                </Tag>
                            </p>
                            {selectedApplication.resumeUrl && (
                                <p className="flex items-center mb-2"><FileText size={18} className="mr-2 text-blue-500" /> <span className="font-medium">CV/Hồ sơ:</span>&nbsp;<a href={selectedApplication.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Xem CV</a></p>
                            )}
                            {selectedApplication.coverLetter && (
                                <p className="flex items-start mb-2"><MailOpen size={18} className="mr-2 text-blue-500 mt-1" /> <span className="font-medium">Thư xin việc:</span>&nbsp;<span className="flex-1">{selectedApplication.coverLetter}</span></p>
                            )}
                            {selectedApplication.notes && (
                                <p className="flex items-start mb-2"><Info size={18} className="mr-2 text-blue-500 mt-1" /> <span className="font-medium">Ghi chú (Admin):</span>&nbsp;<span className="flex-1">{selectedApplication.notes}</span></p>
                            )}
                            {selectedApplication.interviewDate && (
                                <p className="flex items-center mb-2"><Calendar size={18} className="mr-2 text-blue-500" /> <span className="font-medium">Ngày phỏng vấn:</span>&nbsp;{format(new Date(selectedApplication.interviewDate), 'dd/MM/yyyy HH:mm', { locale: vi })}</p>
                            )}
                            {selectedApplication.interviewFeedback && (
                                <p className="flex items-start mb-2"><Info size={18} className="mr-2 text-blue-500 mt-1" /> <span className="font-medium">Phản hồi phỏng vấn:</span>&nbsp;<span className="flex-1">{selectedApplication.interviewFeedback}</span></p>
                            )}
                        </div>
                    )}
                </Modal>
            </div>
        </SBNV>
    );
};

export default DonUngTuyenCuaToi;