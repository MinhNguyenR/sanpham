import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv';
import { message, Spin } from 'antd';
import { DollarSign } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const API_URL = 'http://localhost:5000/api/auth'; 

const LuongThuong = () => {
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [monthlySalary, setMonthlySalary] = useState(null);
    const [annualSalary, setAnnualSalary] = useState(null);

    // Tải thông tin lương tháng/năm của chính người dùng
    const fetchMySalaryDetails = useCallback(async () => {
        if (!user || authLoading) return; // Chỉ chạy khi user đã tải và không còn loading auth
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const now = new Date();
            const currentMonth = now.getMonth(); // Lấy tháng hiện tại
            const currentYear = now.getFullYear(); // Lấy năm hiện tại

            const [monthlyRes, annualRes] = await Promise.all([
                // Thêm query params month và year vào request lương tháng
                axios.get(`${API_URL}/salary/monthly/${user._id}?month=${currentMonth}&year=${currentYear}`, { headers: { Authorization: `Bearer ${token}` } }),
                // Thêm query param year vào request lương năm
                axios.get(`${API_URL}/salary/annual/${user._id}?year=${currentYear}`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            setMonthlySalary(monthlyRes.data);
            setAnnualSalary(annualRes.data);
        } catch (error) {
            message.error('Lỗi khi tải thông tin lương của bạn.');
            console.error('Error fetching my salary details:', error);
            setMonthlySalary(null);
            setAnnualSalary(null);
        } finally {
            setLoading(false);
        }
    }, [user, authLoading]);

    useEffect(() => {
        if (!authLoading && user) { // Kích hoạt khi user đã tải xong
            fetchMySalaryDetails();
        }
    }, [authLoading, user, fetchMySalaryDetails]); // Thay đổi dependency để user cũng kích hoạt

    if (authLoading) { 
        return <Spin tip="Đang tải..." size="large" className="flex justify-center items-center h-screen" />;
    }

    // Nếu user chưa được tải hoặc không có user (chưa đăng nhập), có thể hiển thị một thông báo hoặc chuyển hướng
    if (!user) {
        return (
            <SBNV>
                <div className="container mx-auto p-4 text-center">
                    <p className="text-xl text-gray-600">Vui lòng đăng nhập để xem thông tin lương của bạn.</p>
                </div>
            </SBNV>
        );
    }

    // Hàm để tổng hợp chi tiết thưởng/phạt từ monthlyBreakdown (cho lương năm)
    const getAnnualAdjustmentDetails = (annualData, type) => {
        if (!annualData || !annualData.monthlyBreakdown) return [];
        let allDetails = [];
        annualData.monthlyBreakdown.forEach(monthData => {
            if (type === 'bonus' && monthData.bonusDetails) {
                allDetails = allDetails.concat(monthData.bonusDetails);
            } else if (type === 'deduction' && monthData.deductionDetails) {
                allDetails = allDetails.concat(monthData.deductionDetails);
            }
        });
        return allDetails;
    };


    return (
        <SBNV>
            <div className="container mx-auto p-4 bg-gray-50 font-sans min-h-screen">
                <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
                    <DollarSign size={32} className="mr-3" /> Lương & Thưởng của tôi
                </h1>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-2xl font-semibold text-gray-700 mb-4">Lương của bạn</h2>
                    {loading ? (
                        <Spin tip="Đang tải dữ liệu lương..." />
                    ) : (
                        <div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-4">Chi tiết lương tháng hiện tại</h3>
                            {monthlySalary ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <p><strong>Tháng:</strong> {monthlySalary.month}/{monthlySalary.year}</p>
                                    <p><strong>Lương cứng:</strong> {monthlySalary.baseSalary !== undefined && monthlySalary.baseSalary !== null ? monthlySalary.baseSalary.toLocaleString('vi-VN') : 'N/A'} VND</p>
                                    <p><strong>Tổng thưởng:</strong> {monthlySalary.totalBonus !== undefined && monthlySalary.totalBonus !== null ? monthlySalary.totalBonus.toLocaleString('vi-VN') : 'N/A'} VND</p>
                                    <p><strong>Tổng phạt:</strong> {monthlySalary.totalDeduction !== undefined && monthlySalary.totalDeduction !== null ? monthlySalary.totalDeduction.toLocaleString('vi-VN') : 'N/A'} VND</p>
                                    <p><strong>Lương thực nhận:</strong> <span className="font-bold text-blue-600">{monthlySalary.netSalary !== undefined && monthlySalary.netSalary !== null ? monthlySalary.netSalary.toLocaleString('vi-VN') : 'N/A'} VND</span></p>
                                </div>
                            ) : (
                                <p>Không có dữ liệu lương tháng hiện tại.</p>
                            )}

                            {monthlySalary && monthlySalary.bonusDetails && monthlySalary.bonusDetails.length > 0 && (
                                <div className="mt-6">
                                    <h4 className="text-lg font-semibold text-gray-700 mb-2">Chi tiết thưởng tháng:</h4>
                                    <ul className="list-disc list-inside ml-4">
                                        {monthlySalary.bonusDetails.map((detail, index) => (
                                            <li key={index} className="text-gray-600">
                                                {format(new Date(detail.date), 'dd/MM/yyyy', { locale: vi })}: {detail.reason} - {detail.amount.toLocaleString('vi-VN')} VND
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {monthlySalary && monthlySalary.deductionDetails && monthlySalary.deductionDetails.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="text-lg font-semibold text-gray-700 mb-2">Chi tiết phạt tháng:</h4>
                                    <ul className="list-disc list-inside ml-4">
                                        {monthlySalary.deductionDetails.map((detail, index) => (
                                            <li key={index} className="text-gray-600">
                                                {format(new Date(detail.date), 'dd/MM/yyyy', { locale: vi })}: {detail.reason} - {detail.amount.toLocaleString('vi-VN')} VND
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}


                            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">Chi tiết lương năm hiện tại</h3>
                            {annualSalary ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <p><strong>Năm:</strong> {annualSalary.year}</p>
                                    <p><strong>Tổng lương cứng:</strong> {annualSalary.baseSalary !== undefined && annualSalary.baseSalary !== null ? annualSalary.baseSalary.toLocaleString('vi-VN') : 'N/A'} VND</p>
                                    <p><strong>Tổng lương thực nhận:</strong> <span className="font-bold text-blue-600">{annualSalary.totalAnnualNetSalary !== undefined && annualSalary.totalAnnualNetSalary !== null ? annualSalary.totalAnnualNetSalary.toLocaleString('vi-VN') : 'N/A'} VND</span></p>
                                </div>
                            ) : (
                                <p>Không có dữ liệu lương năm hiện tại.</p>
                            )}

                            {annualSalary && getAnnualAdjustmentDetails(annualSalary, 'bonus').length > 0 && (
                                <div className="mt-6">
                                    <h4 className="text-lg font-semibold text-gray-700 mb-2">Chi tiết thưởng năm:</h4>
                                    <ul className="list-disc list-inside ml-4">
                                        {getAnnualAdjustmentDetails(annualSalary, 'bonus').map((detail, index) => (
                                            <li key={index} className="text-gray-600">
                                                {format(new Date(detail.date), 'dd/MM/yyyy', { locale: vi })}: {detail.reason} - {detail.amount.toLocaleString('vi-VN')} VND
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {annualSalary && getAnnualAdjustmentDetails(annualSalary, 'deduction').length > 0 && (
                                <div className="mt-4">
                                    <h4 className="text-lg font-semibold text-gray-700 mb-2">Chi tiết phạt năm:</h4>
                                    <ul className="list-disc list-inside ml-4">
                                        {getAnnualAdjustmentDetails(annualSalary, 'deduction').map((detail, index) => (
                                            <li key={index} className="text-gray-600">
                                                {format(new Date(detail.date), 'dd/MM/yyyy', { locale: vi })}: {detail.reason} - {detail.amount.toLocaleString('vi-VN')} VND
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </SBNV>
    );
};

export default LuongThuong;
