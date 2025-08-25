import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Context/AuthContext';
import SBNV from '../ChucNang/sbnv';
import { message, Spin } from 'antd'; 
import { DollarSign, Calendar, Info, Award, Heart, Shield, Train, Utensils, PiggyBank, BookOpen, Sun } from 'lucide-react'; 
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const API_URL = 'http://localhost:5000/api/auth';

const PhucLoi = () => {
    const { user, loading: authLoading } = useAuth();
    const [loadingPolicies, setLoadingPolicies] = useState(true);
    const [benefitPolicies, setBenefitPolicies] = useState([]);

    const fetchActiveBenefitPolicies = useCallback(async () => {
        if (!user || authLoading) return;
        setLoadingPolicies(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/benefit-policies/active`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBenefitPolicies(res.data.policies);
        } catch (error) {
            message.error('Lỗi khi tải chính sách phúc lợi.');
            console.error('Error fetching active benefit policies:', error.response ? error.response.data : error.message);
            setBenefitPolicies([]);
        } finally {
            setLoadingPolicies(false);
        }
    }, [user, authLoading]);

    useEffect(() => {
        fetchActiveBenefitPolicies();
    }, [fetchActiveBenefitPolicies]);

    const getPolicyTypeColor = (type) => {
        switch (type) {
            case 'health_insurance': return 'bg-blue-500';
            case 'transport_allowance': return 'bg-purple-500';
            case 'meal_allowance': return 'bg-orange-500';
            case 'paid_leave': return 'bg-green-500';
            case 'bonus': return 'bg-yellow-500';
            case 'training_development': return 'bg-cyan-500';
            case 'wellness_program': return 'bg-pink-500';
            default: return 'bg-gray-500';
        }
    };

    const getPolicyTypeIcon = (type) => {
        switch (type) {
            case 'health_insurance': return <Shield size={24} />;
            case 'transport_allowance': return <Train size={24} />;
            case 'meal_allowance': return <Utensils size={24} />;
            case 'paid_leave': return <Sun size={24} />;
            case 'bonus': return <PiggyBank size={24} />;
            case 'training_development': return <BookOpen size={24} />;
            case 'wellness_program': return <Heart size={24} />;
            default: return <Info size={24} />;
        }
    };

    if (authLoading || loadingPolicies) {
        return <Spin tip="Đang tải chính sách phúc lợi..." size="large" className="flex justify-center items-center min-h-screen" />;
    }

    return (
        <SBNV>
            <div className="container mx-auto p-4 md:p-8 lg:p-12 bg-blue-50 min-h-screen font-sans">
                <div className="flex items-center justify-center text-center mb-10">
                    <div className="flex items-center justify-center p-3 rounded-full bg-yellow-400 text-white shadow-lg mr-4">
                        <Award size={40} />
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-800">
                        Chính sách Phúc lợi
                    </h1>
                </div>

                {benefitPolicies.length === 0 ? (
                    <div className="text-center p-12 bg-white rounded-2xl shadow-xl">
                        <p className="text-2xl font-semibold text-gray-600">Hiện chưa có chính sách phúc lợi nào đang hoạt động.</p>
                        <p className="text-lg mt-4 text-gray-500">Vui lòng liên hệ quản trị viên để biết thêm chi tiết.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                        {benefitPolicies.map(policy => (
                            <div
                                key={policy._id}
                                className="bg-white rounded-2xl shadow-lg p-6 flex flex-col transition-all duration-300 hover:shadow-2xl hover:scale-105"
                            >
                                <div className="flex items-center mb-4">
                                    <div className={`p-3 rounded-full text-white ${getPolicyTypeColor(policy.type)}`}>
                                        {getPolicyTypeIcon(policy.type)}
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 ml-4">{policy.name}</h3>
                                </div>
                                
                                <p className="text-gray-700 mb-4 text-sm">{policy.description}</p>
                                
                                <div className="flex flex-wrap items-center gap-2 mb-4">
                                    <span className="bg-gray-200 text-gray-700 text-xs font-medium px-2.5 py-1 rounded-full">{policy.type.replace(/_/g, ' ').toUpperCase()}</span>
                                    {policy.isMonetary && (
                                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">Tiền tệ</span>
                                    )}
                                </div>

                                {policy.value > 0 && (
                                    <div className="flex items-center text-green-600 font-bold mb-1">
                                        <DollarSign size={18} className="mr-2" />
                                        <span className="text-lg">{policy.value.toLocaleString('vi-VN')} {policy.isMonetary ? 'VND' : ''}</span>
                                    </div>
                                )}
                                
                                <div className="text-gray-600 text-sm mt-auto pt-4 border-t border-gray-200">
                                    <p className="flex items-center mb-1">
                                        <Calendar size={16} className="mr-2 text-gray-400" />
                                        Hiệu lực từ: {format(new Date(policy.effectiveDate), 'dd/MM/yyyy', { locale: vi })}
                                    </p>
                                    {policy.endDate && (
                                        <p className="flex items-center">
                                            <Calendar size={16} className="mr-2 text-gray-400" />
                                            Kết thúc vào: {format(new Date(policy.endDate), 'dd/MM/yyyy', { locale: vi })}
                                        </p>
                                    )}
                                </div>
                                
                                <p className="text-gray-500 text-xs mt-3 italic">
                                    Tiêu chí: {policy.eligibilityCriteria}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </SBNV>
    );
};

export default PhucLoi;
