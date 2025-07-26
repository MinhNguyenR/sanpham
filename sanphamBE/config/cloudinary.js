import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Cấu hình Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cấu hình CloudinaryStorage cho Multer
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => ({
        folder: 'avatars',
        allowed_formats: ['jpeg', 'png', 'jpg'],
        transformation: [{ width: 150, height: 150, crop: 'fill' }],
    }),
});

// Tạo middleware upload bằng Multer, thêm giới hạn kích thước file 5MB
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

export { cloudinary, upload };
