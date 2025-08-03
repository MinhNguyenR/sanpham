// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './Pages/HomePage';
import LoginPage from './Pages/Login';
import RegisterPage from './Pages/Register';
import QuanLyTaiKhoan from './Pages/QuanLyTaiKhoan';
import SettingsPage from './Pages/SettingsPage';
import QuyenRiengTu from './Pages/QuyenRiengTu';
import QuanLyNhanVien from './Pages/QuanLyNhanVien';
import ChamCong from './Pages/ChamCong'; // Trang chấm công cho user và admin
import QLChamCong from './Pages/QLChamCong'; // Trang quản lý chấm công cho admin
import XinNghi from './Pages/XinNghi'; // Import trang XinNghi
import KhieuNai from './Pages/KhieuNai'; // Import trang KhieuNai
import QuanLyXinNghi from './Pages/QuanLyXinNghi'; // Import trang QuanLyXinNghi
import QuanLyKhieuNai from './Pages/QuanLyKhieuNai'; // Import trang QuanLyKhieuNai
import ThongBao from './Pages/ThongBao'; // Import trang ThongBao
import GuiThongBao from './Pages/GuiThongBao'; // Import trang GuiThongBao
import KhoaHoc from './Pages/KhoaHoc'; // Import trang KhoaHoc
import QuanLyKhoaHoc from './Pages/QuanLyKhoaHoc'; // Import trang QuanLyKhoaHoc
import DanhGia from './Pages/DanhGia'; // Import trang DanhGia cho user
import QuanLyDanhGia from './Pages/QuanLyDanhGia'; // Import trang QuanLyDanhGia cho admin

import PrivateRoutes from './Router/PrivateRoutes';
import { AuthProvider } from './Context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/quanlytaikhoan" element={<QuanLyTaiKhoan />} />
          <Route path="/caidat" element={<SettingsPage />} />
          <Route path="/caidat/quyenriengtu" element={<QuyenRiengTu />} />

          {/* Route cho các chức năng chung (user & admin) */}
          <Route path="/chamcong" element={<ChamCong />} />
          <Route path="/xinnghi" element={<XinNghi />} />
          <Route path="/khieunai" element={<KhieuNai />} />
          <Route path="/thongbao" element={<ThongBao />} />
          <Route path="/khoahoc" element={<KhoaHoc />} /> {/* Trang khóa học cho cả user và admin */}
          <Route path="/danhgia" element={<DanhGia />} /> {/* Trang đánh giá cho user */}


          {/* Routes chỉ dành cho Admin */}
          <Route element={<PrivateRoutes allowedRoles={['admin']} />}>
            <Route path="/quanlynhanvien" element={<QuanLyNhanVien />} />
            <Route path="/quanlychamcong" element={<QLChamCong />} />
            <Route path="/quanlyxinnghi" element={<QuanLyXinNghi />} />
            <Route path="/quanlykhieunai" element={<QuanLyKhieuNai />} />
            <Route path="/guithongbao" element={<GuiThongBao />} />
            <Route path="/quanlykhoahoc" element={<QuanLyKhoaHoc />} /> {/* Trang quản lý khóa học cho admin */}
            <Route path="/quanlydanhgia" element={<QuanLyDanhGia />} /> {/* Trang quản lý đánh giá cho admin */}
          </Route>

          <Route path="*" element={
            <div className="flex items-center justify-center h-screen text-2xl text-red-600">
              404 - Trang không tìm thấy
            </div>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
