// frontend/src/Context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { message } from 'antd'; // Import message for notifications

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const API_URL = 'http://localhost:5000/api/auth';

    useEffect(() => {
        const loadUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const config = {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    };
                    const res = await axios.get(`${API_URL}/me`, config);
                    setUser(res.data);
                } catch (error) {
                    console.error('Error loading user:', error);
                    localStorage.removeItem('token');
                    setUser(null);
                }
            }
            setLoading(false);
        };

        loadUser();
    }, []);

    const login = async (email, password) => {
        try {
            const res = await axios.post(`${API_URL}/login`, { email, password });
            localStorage.setItem('token', res.data.token);
            setUser(res.data);
            return { success: true, data: res.data };
        } catch (error) {
            console.error('Login error:', error.response?.data?.message || error.message);
            return { success: false, message: error.response?.data?.message || 'Đăng nhập thất bại' };
        }
    };

    const register = async (name, email, password) => {
        try {
            const res = await axios.post(`${API_URL}/register`, { name, email, password });
            localStorage.setItem('token', res.data.token);
            setUser(res.data);
            return { success: true, data: res.data };
        } catch (error) {
            console.error('Register error:', error.response?.data?.message || error.message);
            return { success: false, message: error.response?.data?.message || 'Đăng ký thất bại' };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    // Hàm uploadAvatar đã được xóa hoàn toàn

    const updateUser = async (updatedData) => { // Đổi userData thành updatedData cho rõ ràng
        try {
            const token = localStorage.getItem('token');
            if (!token) { // Thêm kiểm tra token
                throw new Error('Không có token xác thực. Vui lòng đăng nhập lại.');
            }

            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            };

            const response = await axios.put(`${API_URL}/profile`, updatedData, config);

            // Cập nhật state user với dữ liệu mới từ response của backend
            setUser(response.data); // Backend nên trả về đối tượng user đã cập nhật

            return { success: true, data: response.data };
        } catch (error) {
            console.error('Update profile error:', error.response?.data?.message || error.message);
            // Sử dụng message của Ant Design để hiển thị lỗi
            message.error(error.response?.data?.message || 'Cập nhật thất bại');
            return { success: false, message: error.response?.data?.message || 'Cập nhật thất bại' };
        }
    };

    // NEW: Hàm để xóa tài khoản
    const deleteAccount = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Không có token xác thực. Vui lòng đăng nhập lại.');
            }

            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            
            const response = await axios.delete(`${API_URL}/delete-account`, config); 
            
            if (response.status === 200) {
                // Đăng xuất người dùng sau khi xóa thành công
                logout(); 
                message.success(response.data.message); // Hiển thị thông báo thành công
                return { success: true, message: response.data.message };
            } else {
                message.error(response.data.message || 'Xóa tài khoản thất bại.'); // Hiển thị thông báo lỗi
                return { success: false, message: response.data.message || 'Xóa tài khoản thất bại.' };
            }
        } catch (error) {
            console.error('Delete account error:', error.response?.data?.message || error.message);
            message.error(error.response?.data?.message || 'Xóa tài khoản thất bại.'); // Hiển thị thông báo lỗi
            return { success: false, message: error.response?.data?.message || 'Xóa tài khoản thất bại.' };
        }
    };


    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, deleteAccount }}> 
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};