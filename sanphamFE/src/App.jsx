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
import ChamCong from './Pages/ChamCong'; 
import QLChamCong from './Pages/QLChamCong'; 
import XinNghi from './Pages/XinNghi'; 
import KhieuNai from './Pages/KhieuNai'; 
import QuanLyXinNghi from './Pages/QuanLyXinNghi';
import QuanLyKhieuNai from './Pages/QuanLyKhieuNai';
import ThongBao from './Pages/ThongBao'; 
import GuiThongBao from './Pages/GuiThongBao'; 
import KhoaHoc from './Pages/KhoaHoc'; 
import QuanLyKhoaHoc from './Pages/QuanLyKhoaHoc'; 
import DanhGia from './Pages/DanhGia'; 
import QuanLyDanhGia from './Pages/QuanLyDanhGia'; 
import LuongThuong from './Pages/LuongThuong'; 
import QuanLyLuongThuong from './Pages/QuanLyLuongThuong'; 
import PhucLoi from './Pages/PhucLoi'; 
import QuanLyPhucLoi from './Pages/QuanLyPhucLoi';
import TuyenDung from './Pages/TuyenDung'; 
import DonUngTuyenCuaToi from './Pages/DonUngTuyenCuaToi';
import QuanLyTuyenDung from './Pages/QuanLyTuyenDung'; 
import QuanLyCauHinh from './Pages/QuanLyCauHinh'; 
import QuanLyHopDong from './Pages/QuanLyHopDong';
import HopDongCuaToi from './Pages/HopDongCuaToi'; 
import HopDongSapHetHan from './Pages/HopDongSapHetHan'; 
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
          <Route path="/khoahoc" element={<KhoaHoc />} />
          <Route path="/danhgia" element={<DanhGia />} />
          <Route path="/luongthuong" element={<LuongThuong />} />
          <Route path="/phucloi" element={<PhucLoi />} />
          <Route path="/tuyendung" element={<TuyenDung />} />
          <Route path="/donungtuyencuatoi" element={<DonUngTuyenCuaToi />} />
          <Route path="/hopdongcuatoi" element={<HopDongCuaToi />} />

          {/* Routes chỉ dành cho Admin */}
          <Route element={<PrivateRoutes allowedRoles={['admin']} />}>
            <Route path="/quanlynhanvien" element={<QuanLyNhanVien />} />
            <Route path="/quanlychamcong" element={<QLChamCong />} />
            <Route path="/quanlyxinnghi" element={<QuanLyXinNghi />} />
            <Route path="/quanlykhieunai" element={<QuanLyKhieuNai />} />
            <Route path="/guithongbao" element={<GuiThongBao />} />
            <Route path="/quanlykhoahoc" element={<QuanLyKhoaHoc />} />
            <Route path="/quanlydanhgia" element={<QuanLyDanhGia />} />
            <Route path="/quanlyluongthuong" element={<QuanLyLuongThuong />} />
            <Route path="/quanlyphucloi" element={<QuanLyPhucLoi />} />
            <Route path="/quanlytuyendung" element={<QuanLyTuyenDung />} />
            <Route path="/quanlycauhinh" element={<QuanLyCauHinh />} />
            <Route path="/quanlyhopdong" element={<QuanLyHopDong />} />
            <Route path="/hopdongsaphethan" element={<HopDongSapHetHan />} /> 
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
