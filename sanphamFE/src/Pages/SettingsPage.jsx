import React from "react";
import { Button } from "antd";
import { useNavigate, Link } from 'react-router-dom';
import SBNV from '../ChucNang/sbnv';
import { Bell, Lock, FileText, ArrowLeft } from 'lucide-react';

const SettingsPage = () => {
    const navigate = useNavigate();

    return (
        <SBNV>
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 to-sky-100 p-8">
                <div className="animate-fadeInScale bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md space-y-6 transform transition-all duration-300 hover:shadow-2xl relative">
                    <Link to="/" className="absolute top-4 left-4 text-gray-600 hover:text-blue-600 transition-colors duration-200">
                        <ArrowLeft size={24} />
                    </Link>
                    <h2 className="text-4xl font-extrabold text-center text-blue-700 mb-2 drop-shadow-sm mt-4">
                        Cài đặt
                    </h2>
                    <p className="text-center text-gray-500 mb-8">
                        Quản lý các tùy chọn và cài đặt của bạn.
                    </p>
                    <Button
                        type="default"
                        size="large"
                        className="w-full text-lg h-auto py-3 rounded-lg border-blue-500 text-blue-700 hover:text-blue-800 hover:border-blue-600 transition-all duration-200 hover:scale-[1.01] flex items-center justify-center"
                        onClick={() => navigate('/caidatthongbao')}
                    >
                        <Bell className="mr-2" />
                        Cài đặt thông báo
                    </Button>
                    <Button
                        type="default"
                        size="large"
                        className="w-full text-lg h-auto py-3 rounded-lg border-blue-500 text-blue-700 hover:text-blue-800 hover:border-blue-600 transition-all duration-200 hover:scale-[1.01] flex items-center justify-center"
                        onClick={() => navigate('/caidat/quyenriengtu')}
                    >
                        <Lock className="mr-2" />
                        Cài đặt quyền riêng tư
                    </Button>
                    <Button
                        type="default"
                        size="large"
                        className="w-full text-lg h-auto py-3 rounded-lg border-blue-500 text-blue-700 hover:text-blue-800 hover:border-blue-600 transition-all duration-200 hover:scale-[1.01] flex items-center justify-center"
                        onClick={() => navigate('/dieukhoansudung')}
                    >
                        <FileText className="mr-2" />
                        Điều khoản
                    </Button>
                </div>
            </div>
        </SBNV>
    );
};

export default SettingsPage;
