import express from 'express';
import {
    registerUser,
    loginUser,
    getMe,
    updateProfile,
    deleteUser,
} from '../controllers/authController.js';
import {
    getAllUsers,
    getAllUsersForManagement,
    updateUserByAdmin,
    deleteUserByAdmin
} from '../controllers/adminController.js';
import {
    checkIn,
    markLeave,
    getAttendanceForAdmin,
    getUserAttendance,
    updateAttendanceLeaveStatus,
} from '../controllers/attendanceController.js';
import {
    createLeaveRequest,
    getUserLeaveRequests,
    getAllLeaveRequests,
    updateLeaveRequestStatus,
} from '../controllers/leaveRequestController.js';
import {
    createComplaint,
    getUserComplaints,
    getAllComplaints,
    updateComplaintStatus,
} from '../controllers/complaintController.js';
import {
    getUserNotifications,
    sendAdminNotification,
    getSentNotifications,
    markNotificationAsRead,
    deleteNotification,
    clearReadNotifications,
} from '../controllers/notificationController.js';
import {
    createCourse,
    getAllCourses,
    getCourseById,
    updateCourse,
    deleteCourse,
    getAdminCreatedCourses,
} from '../controllers/trainingCourseController.js';
import {
    registerForCourse,
    getUserRegistrations,
    getCourseRegistrationsForAdmin,
    getAdminAllRegistrations,
    updateRegistrationStatus,
} from '../controllers/courseRegistrationController.js';
import {
    createEvaluationForm,
    getAdminCreatedEvaluationForms,
    getEvaluationFormById,
    getAllAvailableEvaluationFormsForUser,
    deleteEvaluationForm,
} from '../controllers/evaluationFormController.js';
import {
    submitEvaluationResponse,
    getUserEvaluationResponses,
    getAdminEvaluationResponses,
    getEvaluationResponseById,
    markResponseAsReceived,
} from '../controllers/evaluationResponseController.js';
import {
    setBaseSalary,
    addSalaryAdjustment,
    getMonthlySalaryDetails,
    getAnnualSalaryDetails,
    getAllSalaryAdjustments,
    deleteSalaryAdjustment,
    bulkDeleteSalaryAdjustments,
} from '../controllers/salaryController.js';
import {
    createBenefitPolicy,
    getAllBenefitPoliciesForAdmin,
    getBenefitPolicyById,
    updateBenefitPolicy,
    deleteBenefitPolicy,
    getActiveBenefitPoliciesForUser,
} from '../controllers/benefitPolicyController.js';
import {
    createJobPosting,
    getAllJobPostingsForAdmin,
    getOpenJobPostingsForUser,
    getJobPostingById,
    updateJobPosting,
    deleteJobPosting,
} from '../controllers/jobPostingController.js';
import {
    submitApplication,
    getUserApplications,
    getAllApplicationsForAdmin,
    getApplicationById,
    updateApplicationStatus,
    deleteApplication,
} from '../controllers/applicationController.js';
import {
    createDepartment,
    getAllDepartments,
    getDepartmentById,
    updateDepartment,
    deleteDepartment,
} from '../controllers/departmentController.js';
import {
    createPosition,
    getAllPositions,
    getPositionById,
    updatePosition,
    deletePosition,
} from '../controllers/positionController.js';
import {
    createLeaveType,
    getAllLeaveTypes,
    getLeaveTypeById,
    updateLeaveType,
    deleteLeaveType,
} from '../controllers/leaveTypeController.js';
import {
    createSalaryAdjustmentCategory,
    getAllSalaryAdjustmentCategories,
    getSalaryAdjustmentCategoryById,
    updateSalaryAdjustmentCategory,
    deleteSalaryAdjustmentCategory,
} from '../controllers/salaryAdjustmentCategoryController.js';
import {
    createContract,
    getAllContracts,
    getContractById,
    updateContract,
    deleteContract,
    getUserContracts,
    getMyContracts,
    getContractsExpiringSoon,
} from '../controllers/contractController.js';

import { protect, authorizeRoles } from '../middleware/middleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.delete('/delete-account', protect, deleteUser);

router.get('/users', protect, authorizeRoles('admin'), getAllUsers);
router.get('/users-management', protect, authorizeRoles('admin'), getAllUsersForManagement);
router.put('/users/:id', protect, authorizeRoles('admin'), updateUserByAdmin);
router.delete('/users/:id', protect, authorizeRoles('admin'), deleteUserByAdmin);

router.post('/attendance/check-in', protect, checkIn);
router.get('/attendance/me', protect, getUserAttendance);
router.post('/attendance/mark-leave', protect, authorizeRoles('admin'), markLeave);
router.get('/attendance/admin', protect, authorizeRoles('admin'), getAttendanceForAdmin);
router.put('/attendance/:id/leave', protect, authorizeRoles('admin'), updateAttendanceLeaveStatus);

router.post('/leave-requests', protect, createLeaveRequest);
router.get('/leave-requests/me', protect, getUserLeaveRequests);
router.get('/leave-requests/admin', protect, authorizeRoles('admin'), getAllLeaveRequests);
router.put('/leave-requests/:id/status', protect, authorizeRoles('admin'), updateLeaveRequestStatus);

router.post('/complaints', protect, createComplaint);
router.get('/complaints/me', protect, getUserComplaints);
router.get('/complaints/admin', protect, authorizeRoles('admin'), getAllComplaints);
router.put('/complaints/:id/status', protect, authorizeRoles('admin'), updateComplaintStatus);

router.get('/notifications/me', protect, getUserNotifications);
router.post('/notifications/send', protect, authorizeRoles('admin'), sendAdminNotification);
router.get('/notifications/sent', protect, authorizeRoles('admin'), getSentNotifications);
router.put('/notifications/:id/read', protect, markNotificationAsRead);
router.delete('/notifications/read', protect, clearReadNotifications);
router.delete('/notifications/:id', protect, authorizeRoles('admin'), deleteNotification);

router.get('/training-courses/my-registrations', protect, getUserRegistrations);
router.get('/training-courses/my-created', protect, authorizeRoles('admin'), getAdminCreatedCourses);
router.get('/training-courses/admin/all-registrations', protect, authorizeRoles('admin'), getAdminAllRegistrations);

router.post('/training-courses/:id/register', protect, registerForCourse);
router.get('/training-courses/:id/registrations', protect, authorizeRoles('admin'), getCourseRegistrationsForAdmin);
router.put('/training-courses/registrations/:id/status', protect, authorizeRoles('admin'), updateRegistrationStatus);

router.post('/training-courses', protect, authorizeRoles('admin'), createCourse);
router.get('/training-courses', protect, getAllCourses);
router.get('/training-courses/:id', protect, getCourseById);
router.put('/training-courses/:id', protect, authorizeRoles('admin'), updateCourse);
router.delete('/training-courses/:id', protect, authorizeRoles('admin'), deleteCourse);

router.post('/evaluation-forms', protect, authorizeRoles('admin'), createEvaluationForm);
router.get('/evaluation-forms/my-created', protect, authorizeRoles('admin'), getAdminCreatedEvaluationForms);
router.get('/evaluation-forms/available', protect, getAllAvailableEvaluationFormsForUser);
router.get('/evaluation-forms/:id', protect, getEvaluationFormById);
router.delete('/evaluation-forms/:id', protect, authorizeRoles('admin'), deleteEvaluationForm);

router.post('/evaluation-forms/:formId/submit-response', protect, submitEvaluationResponse);
router.get('/evaluation-responses/me', protect, getUserEvaluationResponses);
router.get('/evaluation-responses/admin/all', protect, authorizeRoles('admin'), getAdminEvaluationResponses);
router.get('/evaluation-responses/:id', protect, authorizeRoles('admin'), getEvaluationResponseById);
router.put('/evaluation-responses/:id/mark-received', protect, authorizeRoles('admin'), markResponseAsReceived);

router.put('/salary/base/:id', protect, authorizeRoles('admin'), setBaseSalary);
router.post('/salary/adjustments', protect, authorizeRoles('admin'), addSalaryAdjustment);
router.get('/salary/monthly/:userId', protect, getMonthlySalaryDetails);
router.get('/salary/annual/:userId', protect, getAnnualSalaryDetails);
router.get('/salary/adjustments/all', protect, authorizeRoles('admin'), getAllSalaryAdjustments);
router.delete('/salary/adjustments/:id', protect, authorizeRoles('admin'), deleteSalaryAdjustment);
router.post('/salary/adjustments/bulk-delete', protect, authorizeRoles('admin'), bulkDeleteSalaryAdjustments);

router.post('/benefit-policies', protect, authorizeRoles('admin'), createBenefitPolicy);
router.get('/benefit-policies/admin', protect, authorizeRoles('admin'), getAllBenefitPoliciesForAdmin);
router.get('/benefit-policies/active', protect, getActiveBenefitPoliciesForUser);
router.get('/benefit-policies/:id', protect, authorizeRoles('admin'), getBenefitPolicyById);
router.put('/benefit-policies/:id', protect, authorizeRoles('admin'), updateBenefitPolicy);
router.delete('/benefit-policies/:id', protect, authorizeRoles('admin'), deleteBenefitPolicy);

router.post('/recruitment/job-postings', protect, authorizeRoles('admin'), createJobPosting);
router.get('/recruitment/job-postings/admin', protect, authorizeRoles('admin'), getAllJobPostingsForAdmin);
router.get('/recruitment/job-postings/open', protect, getOpenJobPostingsForUser);
router.get('/recruitment/job-postings/:id', protect, getJobPostingById);
router.put('/recruitment/job-postings/:id', protect, authorizeRoles('admin'), updateJobPosting);
router.delete('/recruitment/job-postings/:id', protect, authorizeRoles('admin'), deleteJobPosting);

router.post('/recruitment/applications', protect, submitApplication);
router.get('/recruitment/applications/me', protect, getUserApplications);
router.get('/recruitment/applications/admin', protect, authorizeRoles('admin'), getAllApplicationsForAdmin);
router.get('/recruitment/applications/:id', protect, getApplicationById);
router.put('/recruitment/applications/:id/status', protect, authorizeRoles('admin'), updateApplicationStatus);
router.delete('/recruitment/applications/:id', protect, authorizeRoles('admin'), deleteApplication);

router.post('/config/departments', protect, authorizeRoles('admin'), createDepartment);
router.get('/config/departments', protect, authorizeRoles('admin'), getAllDepartments);
router.get('/config/departments/:id', protect, authorizeRoles('admin'), getDepartmentById);
router.put('/config/departments/:id', protect, authorizeRoles('admin'), updateDepartment);
router.delete('/config/departments/:id', protect, authorizeRoles('admin'), deleteDepartment);

router.post('/config/positions', protect, authorizeRoles('admin'), createPosition);
router.get('/config/positions', protect, authorizeRoles('admin'), getAllPositions);
router.get('/config/positions/:id', protect, authorizeRoles('admin'), getPositionById);
router.put('/config/positions/:id', protect, authorizeRoles('admin'), updatePosition);
router.delete('/config/positions/:id', protect, authorizeRoles('admin'), deletePosition);

router.post('/config/leave-types', protect, authorizeRoles('admin'), createLeaveType);
router.get('/config/leave-types', protect, authorizeRoles('admin'), getAllLeaveTypes);
router.get('/config/leave-types/:id', protect, authorizeRoles('admin'), getLeaveTypeById);
router.put('/config/leave-types/:id', protect, authorizeRoles('admin'), updateLeaveType);
router.delete('/config/leave-types/:id', protect, authorizeRoles('admin'), deleteLeaveType);


router.post('/config/salary-categories', protect, authorizeRoles('admin'), createSalaryAdjustmentCategory);
router.get('/config/salary-categories', protect, authorizeRoles('admin'), getAllSalaryAdjustmentCategories);
router.get('/config/salary-categories/:id', protect, authorizeRoles('admin'), getSalaryAdjustmentCategoryById);
router.put('/config/salary-categories/:id', protect, authorizeRoles('admin'), updateSalaryAdjustmentCategory);
router.delete('/config/salary-categories/:id', protect, authorizeRoles('admin'), deleteSalaryAdjustmentCategory);


router.get('/contracts/me', protect, getMyContracts); 
router.get('/contracts/expiring-soon', protect, authorizeRoles('admin'), getContractsExpiringSoon); 
router.get('/contracts/user/:userId', protect, authorizeRoles('admin'), getUserContracts); 

router.post('/contracts', protect, authorizeRoles('admin'), createContract);
router.get('/contracts', protect, authorizeRoles('admin'), getAllContracts);
router.get('/contracts/:id', protect, authorizeRoles('admin'), getContractById);
router.put('/contracts/:id', protect, authorizeRoles('admin'), updateContract);
router.delete('/contracts/:id', protect, authorizeRoles('admin'), deleteContract);


export default router;
