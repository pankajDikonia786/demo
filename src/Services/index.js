    const express = require("express");
const fs = require("fs");
const router = express.Router();
const multer = require("multer");

/*** Middleware ***/
const authorize = require("../middleware/authorize");
const configBssDb = require("../middleware/configBssDb");
const mobileLibertyAuthorize = require("../middleware/mobileLibertyAuthorize");

/******************Super admin Controllers************/

/*** Super Admin Auth Controller ***/
const SuperAdminAuthController = require("./Controllers/Admin/SuperAdminAuthController");

/*** Super Admin Dashboard Controller ***/
const AdminDashboardController = require("./Controllers/Admin/AdminDashboardController");

/*** Admin Controller ***/
const AdminController = require("./Controllers/Admin/AdminController");

/*** Admin Auth Controller ***/
const AdminAuthController = require("./Controllers/Admin/AdminAuthController");

/*** Admin School Controller ***/
const AdminSchoolController = require("./Controllers/Admin/AdminSchoolController");

/*************** End Super admin Controllers ***********/

/*** Common Controller ***/
const CommonController = require("./Controllers/CommonController");

/***School Setting Controller ***/
const SchoolSettingController = require("./Controllers/SchoolSettingController");

/*** User Controller ***/
const UserController = require("./Controllers/UserController");

/*** Student Controller ***/
const StudentController = require("./Controllers/StudentController");


/*** Setting Controller ***/
const SettingController = require("./Controllers/SettingController");

/**** SnapShot Controller ****/
const SnapshotController = require("./Controllers/SnapshotController");

/*** Student Dashboard Controller ***/
const StudentDashboardController = require("./Controllers/StudentDashboardController");

/***  Roll Call Controller ***/
const RollCallController = require("./Controllers/RollCallController");

/*** Leave Setting Controller ***/
const LeaveSettingController = require("./Controllers//LeaveSettingController");

/*** Student Crone Controller***/
const StudentCroneController = require("./Controllers/StudentCroneController");

/*** Mobile liberty Controllers Start***/

/* Liberty auth controller */
const LibertyAuthController = require("./Controllers/Mobile-Liberty/LibertyAuthController");

/*liberty Parent and student controller */
const LibertyStudentAndParentController = require("./Controllers/Mobile-Liberty/LibertyStudentAndParentController");

/* liberty student controller */
const LibertyStudentController = require("./Controllers/Mobile-Liberty/LibertyStudentController");

const ReportsController =require("./Controllers/ReportsController")

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        //create the specific folder according to the school
        let path;
        let school_code = req.body?.school_code || req.headers?.school_code;
        console.log("multer folder school code--------------------------", school_code)
        if (school_code) {
            path = `./uploads/${school_code.toLowerCase()}`
            console.log(path)
            if (!fs.existsSync(path)) {
                fs.mkdirSync(path);
            }
        } else {
            return cb(new Error('Multer upload school folder path required!'), false);
        }
        cb(null, path);
    },
    filename: function (req, file, cb) {
        const split_mime = file.mimetype.split("/");
        const extension = typeof split_mime[1] !== "undefined" ? split_mime[1] : "jpeg";
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + "." + extension);
    },
});
const upload = multer({ storage: storage, });

/** Student Crone Test Controller**/

// router.get("/api/UpdateAllSchoolStudentsAgeCrone", upload.none(), StudentCroneController.UpdateAllSchoolStudentsAgeCrone);

/*******************Super Admin routes start******************/

/************ Super Admin Auth Routes ************/
//https://bssnew.dikonia.in/api/superadmin/RegisterSuperAdmin
router.post("/api/superadmin/RegisterSuperAdmin", upload.none(), SuperAdminAuthController.RegisterSuperAdmin);

/************ Admin Auth Routes ***********/
//https://bssnew.dikonia.in/api/SignIn
router.post("/api/SignIn", upload.none(), AdminAuthController.SignIn);
router.post("/api/ForgotPassword", upload.none(), AdminAuthController.ForgotPassword);
router.post("/api/ResetPassword", upload.none(), AdminAuthController.ResetPassword);

/************* Admin  Routes **************/
//https://bssnew.dikonia.in/api/superadmin/GetAllSelectedCountries
router.get("/api/superadmin/GetAllSelectedCountries", authorize(), upload.none(), AdminController.GetAllSelectedCountries);
router.put("/api/superadmin/SelectCountry", authorize(), upload.none(), AdminController.SelectCountry);
router.post("/api/superadmin/CreateNewState", authorize(), upload.none(), AdminController.CreateNewState);
router.post("/api/superadmin/CreateNewCity", authorize(), upload.none(), AdminController.CreateNewCity);
router.put("/api/superadmin/DeactivateState", authorize(), upload.none(), AdminController.DeactivateState);
router.put("/api/superadmin/DeactivateCity", authorize(), upload.none(), AdminController.DeactivateCity);
router.put("/api/superadmin/UpdateSchoolUser", authorize(), upload.single("avatar"), AdminController.UpdateSchoolUser);
router.post("/api/superadmin/LoginAsSchoolAdmin", authorize(), upload.none(), AdminController.LoginAsSchoolAdmin);

/***************** Admin School Routes *************/

//https://bssnew.dikonia.in/api/superadmin/CreateSchool
router.post("/api/superadmin/CreateSchool", authorize(), upload.fields([{ name: "school_logo" }, { name: "avatar" }]), AdminSchoolController.CreateSchool);
router.put("/api/superadmin/DeactivateSchool", authorize(), upload.none(), AdminSchoolController.DeactivateSchool);
router.get("/api/superadmin/GetAllSchool", authorize(), upload.none(), AdminSchoolController.GetAllSchools);
router.get("/api/superadmin/GetSchoolById", authorize(), upload.none(), AdminSchoolController.GetSchoolById);
router.put("/api/superadmin/UpdateSchool", authorize(), upload.single("school_logo"), AdminSchoolController.UpdateSchool);
// router.delete("/api/superadmin/DeleteSchoolAndDatabase", authorize(), upload.none(), AdminSchoolController.DeleteSchoolAndDatabase);
router.put("/api/superadmin/createUserSubscription", authorize(), upload.single("school_logo"), AdminSchoolController.createUserSubscription);


/*********************** End Super Admin routes *********************/


/***************** Admin Dashboard Routes *************/
router.get("/api/superadmin/GetAllDashboardSchools", authorize(), upload.none(), AdminDashboardController.GetAllDashboardSchools);

/*********************** End Super Admin routes *********************/

/*************** Common Routes ************/
// https://bssnew.dikonia.in/api/GetAllCountries
router.get("/api/GetAllCountries", upload.none(), CommonController.GetAllCountries);
router.get("/api/GetAllStatesByCountryId", upload.none(), CommonController.GetAllStatesByCountryId);
router.get("/api/GetAllCitiesByStateId", upload.none(), CommonController.GetAllCitiesByStateId);
router.get("/api/GetAllTimezonesByCountryCode", upload.none(), CommonController.GetAllTimezonesByCountryCode);
router.get("/api/GetAllCountryRegions", upload.none(), CommonController.GetAllCountryRegions);

/***************School Settings Routes ************/
// https://bssnew.dikonia.in/api/bss-admin/CreateDormitories
router.post("/api/bss-admin/CreateDormitories", authorize(), upload.single("dormitory_image"), configBssDb(), SchoolSettingController.CreateDormitories);
router.get("/api/bss-admin/GetAllDormitory", authorize(), upload.none(), configBssDb(), SchoolSettingController.GetAllDormitory);
router.put("/api/bss-admin/UpdateDormitoryStatus", authorize(), upload.none(), configBssDb(), SchoolSettingController.UpdateDormitoryStatus);
router.put("/api/bss-admin/UpdateDormitory", authorize(), upload.single("dormitory_image"), configBssDb(), SchoolSettingController.UpdateDormitory);
router.get("/api/bss-admin/GetDormitoryDetailsById", authorize(), upload.none(), configBssDb(), SchoolSettingController.GetDormitoryDetailsById);
router.delete("/api/bss-admin/RemoveDormitoryUser", authorize(), upload.none(), configBssDb(), SchoolSettingController.RemoveDormitoryUser);
router.delete("/api/bss-admin/DeleteDormitory", authorize(), upload.none(), configBssDb(), SchoolSettingController.DeleteDormitory);
router.post("/api/bss-admin/CreateClass", authorize(), upload.none(), configBssDb(), SchoolSettingController.CreateClass);
router.get("/api/bss-admin/GetAllClassesDetails", authorize(), upload.none(), configBssDb(), SchoolSettingController.GetAllClassesDetails);
router.get("/api/bss-admin/GetAllClassesList", authorize(), upload.none(), configBssDb(), SchoolSettingController.GetAllClassesList);
router.get("/api/bss-admin/GetClassDetailsById", authorize(), upload.none(), configBssDb(), SchoolSettingController.GetClassDetailsById);
router.put("/api/bss-admin/UpdateClass", authorize(), upload.none(), configBssDb(), SchoolSettingController.UpdateClass);
router.put("/api/bss-admin/UpdateClassStatus", authorize(), upload.none(), configBssDb(), SchoolSettingController.UpdateClassStatus);
router.delete("/api/bss-admin/DeleteClass", authorize(), upload.none(), configBssDb(), SchoolSettingController.DeleteClass);

/*************** User Routes ***************/
// https://bssnew.dikonia.in/api/bss-admin/GetAllUserBySchool
router.post("/api/bss-admin/CreateSchoolManager", authorize(), upload.single("avatar"), configBssDb(), UserController.CreateSchoolManager);
router.get("/api/bss-admin/GetAllManagersBySchoolId", authorize(), upload.none(), configBssDb(), UserController.GetAllManagersBySchoolId);
router.get("/api/bss-admin/GetAllManagersListBySchoolId", authorize(), upload.none(), configBssDb(), UserController.GetAllManagersListBySchoolId);
router.get("/api/bss-admin/GetSchoolManagerById", authorize(), upload.none(), configBssDb(), UserController.GetSchoolManagerById);
router.put("/api/bss-admin/UpdateUserProfile", authorize(), upload.single("avatar"), configBssDb(), UserController.UpdateUserProfile);
router.put("/api/bss-admin/UpdateSchooManager", authorize(), upload.single("avatar"), configBssDb(), UserController.UpdateSchooManager);
router.put("/api/bss-admin/UpdateManagerPassword", authorize(), upload.none(), configBssDb(), UserController.UpdateManagerPassword);
router.get("/api/bss-admin/BssSystemLogs",authorize(),upload.none(), configBssDb(), UserController.BssSystemLogs);

router.put("/api/bss-admin/ArchiveOrUnarchiveManager", authorize(), upload.none(), configBssDb(), UserController.ArchiveOrUnarchiveManager);
router.get("/api/bss-admin/ExportManagersCsv", authorize(), upload.none(), configBssDb(), UserController.ExportManagersCsv);
router.get("/api/bss-admin/ExportManagersPdf", authorize(), upload.none(), configBssDb(), UserController.ExportManagersPdf);

router.put("/api/bss-admin/UpdateManagerPermissions", authorize(), upload.none(), configBssDb(), UserController.UpdateManagerPermissions);
router.get("/api/bss-admin/GetManagerPermissonDetailsById", authorize(), upload.none(), configBssDb(), UserController.GetManagerPermissonDetailsById);
router.get("/api/bss-admin/GetManagerPermissonHistoryById", authorize(), upload.none(), configBssDb(), UserController.GetManagerPermissonHistoryById);
router.get("/api/bss-admin/GetLoginUserPermissions", authorize(), upload.none(), configBssDb(), UserController.GetLoginUserPermissions);

router.get("/api/bss-admin/GetStuLocNotificationsbyUserId", authorize(), upload.none(), configBssDb(), UserController.GetStuLocNotificationsbyUserId);
router.put("/api/bss-admin/UpdateStuLocNotificationStatus", authorize(), upload.none(), configBssDb(), UserController.UpdateStuLocNotificationStatus);
router.delete("/api/bss-admin/DeleteStuLocNotificationsbyUserId", authorize(), upload.none(), configBssDb(), UserController.DeleteStuLocNotificationsbyUserId);
router.get("/api/bss-admin/GetRoleAndPermissionList", authorize(), upload.none(), configBssDb(), UserController.GetRoleAndPermissionList);
router.post("/api/bss-admin/createUserSubscription",authorize(),upload.none(), configBssDb(), UserController.createUserSubscription);



/*************** Student Routes ***************/
// https://bssnew.dikonia.in/api/bss-admin/CreateStudentAndParents
router.post("/api/bss-admin/CreateStudentAndParents", authorize(), upload.single("student_avatar"), configBssDb(), StudentController.CreateStudentAndParents);
router.get("/api/bss-admin/GetAllStudents", authorize(), upload.none(), configBssDb(), StudentController.GetAllStudents);
router.get("/api/bss-admin/GetStudentAndParentById", authorize(), upload.none(), configBssDb(), StudentController.GetStudentAndParentById);
router.put("/api/bss-admin/UpdateParentPersonal", authorize(), upload.none(), configBssDb(), StudentController.UpdateParentPersonal);
router.delete("/api/bss-admin/RemoveParentAddress", authorize(), upload.none(), configBssDb(), StudentController.RemoveParentAddress);

router.put("/api/bss-admin/UpdateStudentPersonal", authorize(), upload.single("student_avatar"), configBssDb(), StudentController.UpdateStudentPersonal);
router.delete("/api/bss-admin/DeleteStudentAllergyById", authorize(), upload.none(), configBssDb(), StudentController.DeleteStudentAllergyById);
router.put("/api/bss-admin/UpdateStudentStatus", authorize(), upload.none(), configBssDb(), StudentController.UpdateStudentStatus);
router.get("/api/bss-admin/GetParentDetailsByParentEmail", authorize(), upload.none(), configBssDb(), StudentController.GetParentDetailsByParentEmail);
router.get("/api/bss-admin/GetStudentHostByHostEmail", authorize(), upload.none(), configBssDb(), StudentController.GetStudentHostByHostEmail);
router.put("/api/bss-admin/AddOrUpdateStudentHost", authorize(), upload.none(), configBssDb(), StudentController.AddOrUpdateStudentHost);



router.post("/api/bss-admin/AddStudentNewAllergyDetails", authorize(), upload.none(), configBssDb(), StudentController.AddStudentNewAllergyDetails);
router.get("/api/bss-admin/GetAllAllergicStudentsDetail", authorize(), upload.none(), configBssDb(), StudentController.GetAllAllergicStudentsDetail);
router.get("/api/bss-admin/GetAllergicStudentDetailById", authorize(), upload.none(), configBssDb(), StudentController.GetAllergicStudentDetailById);
router.put("/api/bss-admin/AddOrUpdateStudentAllergyDetails", authorize(), upload.none(), configBssDb(), StudentController.AddOrUpdateStudentAllergyDetails);
router.get("/api/bss-admin/GetAllNonAllergicStudentsList", authorize(), upload.none(), configBssDb(), StudentController.GetAllNonAllergicStudentsList);
router.delete("/api/bss-admin/RemoveAllAllergyOfStudent", authorize(), upload.none(), configBssDb(), StudentController.RemoveAllAllergyOfStudent);
router.get("/api/bss-admin/GenerateAllergicStudentsReport", authorize(), upload.none(), configBssDb(), StudentController.GenerateAllergicStudentsReport);


router.get("/api/bss-admin/GetAllStudentsList", authorize(), configBssDb(), StudentController.GetAllStudentsList);
router.post("/api/bss-admin/CreateStudentGeneric", authorize(), upload.none(), configBssDb(), StudentController.CreateStudentGeneric);
router.get("/api/bss-admin/GetAllStudentsGeneric", authorize(), upload.none(), configBssDb(), StudentController.GetAllStudentsGeneric);
router.get("/api/bss-admin/GetStudentGenericById", authorize(), upload.none(), configBssDb(), StudentController.GetStudentGenericById);
router.delete("/api/bss-admin/DeleteStudentGeneric", authorize(), upload.none(), configBssDb(), StudentController.DeleteStudentGeneric);
router.put("/api/bss-admin/UpdateStudentGenericStatus", authorize(), upload.none(), configBssDb(), StudentController.UpdateStudentGenericStatus);
router.put("/api/bss-admin/UpdateStudentGeneric", authorize(), upload.none(), configBssDb(), StudentController.UpdateStudentGeneric);

router.post("/api/bss-admin/CreateStudentGrounded", authorize(), upload.none(), configBssDb(), StudentController.CreateStudentGrounded);
router.get("/api/bss-admin/GetAllGroundedStudents", authorize(), upload.none(), configBssDb(), StudentController.GetAllGroundedStudents);
router.get("/api/bss-admin/GetGroundedStudentById", authorize(), upload.none(), configBssDb(), StudentController.GetGroundedStudentById);

router.put("/api/bss-admin/UpdateStudentGroundedDetails", authorize(), upload.none(), configBssDb(), StudentController.UpdateStudentGroundedDetails);
router.put("/api/bss-admin/UpdateGroundedStudentStatus", authorize(), upload.none(), configBssDb(), StudentController.UpdateGroundedStudentStatus);
router.delete("/api/bss-admin/DeleteStudentGrounded", authorize(), upload.none(), configBssDb(), StudentController.DeleteStudentGrounded);

router.get("/api/bss-admin/GetAllDuplicateStudents", authorize(), upload.none(), configBssDb(), StudentController.GetAllDuplicateStudents);
router.put("/api/bss-admin/UpdateStudentDuplicateStatus", authorize(), upload.none(), configBssDb(), StudentController.UpdateStudentDuplicateStatus);

router.put("/api/bss-admin/StudentsRollOver", authorize(), upload.none(), configBssDb(), StudentController.StudentsRollOver);

router.put("/api/bss-admin/ChangeStudentsDormitory", authorize(), upload.none(), configBssDb(), StudentController.ChangeStudentsDormitory);

router.get("/api/bss-admin/GetStudentsByDormitoryId", authorize(), upload.none(), configBssDb(), StudentController.GetStudentsByDormitoryId);

router.post("/api/bss-admin/ImportStudentsCsv", authorize(), upload.single("students_csv"), configBssDb(), StudentController.ImportStudentsCsv);

router.get("/api/bss-admin/ExportStudentsCsv", authorize(), upload.none(), configBssDb(), StudentController.ExportStudentsCsv);

router.get("/api/bss-admin/ExportStudentsPdf", authorize(), upload.none(), configBssDb(), StudentController.ExportStudentsPdf);

router.get("/api/bss-admin/GetAllStudentsForCard", authorize(), upload.none(), configBssDb(), StudentController.GetAllStudentsForCard);

router.get("/api/bss-admin/GetAllStudentCountForChart", authorize(), upload.none(), configBssDb(), StudentController.GetAllStudentCountForChart);

router.delete('/api/bss-admin/DeleteStudent', authorize(), upload.none(), configBssDb(), StudentController.DeleteStudent);


/******************* Setting Routes *******************/
// https://bssnew.dikonia.in/api/bss-admin/CreateUserMessage

router.get("/api/bss-admin/GetMonthlyAbsentReasonForChart", authorize(), upload.none(), configBssDb(), SettingController.GetMonthlyAbsentReasonForChart);
router.get("/api/bss-admin/GetYearlyAbsentReasonForChart", authorize(), upload.none(), configBssDb(), SettingController.GetYearlyAbsentReasonForChart);
router.get("/api/bss-admin/GetMonthlyAttendanceCountForChart", authorize(), upload.none(), configBssDb(), SettingController.GetMonthlyAttendanceCountForChart);
router.get("/api/bss-admin/GetYearlyAttendanceCountForChart", authorize(), upload.none(), configBssDb(), SettingController.GetYearlyAttendanceCountForChart);

router.post("/api/bss-admin/CreateUserMessage", authorize(), upload.none(), configBssDb(), SettingController.CreateUserMessage);
router.get("/api/bss-admin/GetAllUserMessages", authorize(), upload.none(), configBssDb(), SettingController.GetAllUserMessages);
router.get("/api/bss-admin/GetUserMessageById", authorize(), upload.none(), configBssDb(), SettingController.GetUserMessageById);
router.put("/api/bss-admin/UpdateUserMessageStatus", authorize(), upload.none(), configBssDb(), SettingController.UpdateUserMessageStatus);
router.put("/api/bss-admin/UpdateUserMessage", authorize(), upload.none(), configBssDb(), SettingController.UpdateUserMessage);
router.delete("/api/bss-admin/DeleteUserMessage", authorize(), upload.none(), configBssDb(), SettingController.DeleteUserMessage);

router.post("/api/bss-admin/CreateCustomLink", authorize(), upload.none(), configBssDb(), SettingController.CreateCustomLink);
router.get("/api/bss-admin/GetAllCustomLinks", authorize(), upload.none(), configBssDb(), SettingController.GetAllCustomLinks);
router.get("/api/bss-admin/GetCustomLinkById", authorize(), upload.none(), configBssDb(), SettingController.GetCustomLinkById);
router.put("/api/bss-admin/UpdateCustomLink", authorize(), upload.none(), configBssDb(), SettingController.UpdateCustomLink);
router.delete("/api/bss-admin/DeleteCustomLink", authorize(), upload.none(), configBssDb(), SettingController.DeleteCustomLink);

router.post("/api/bss-admin/CreateOnCampusLocation", authorize(), upload.none(), configBssDb(), SettingController.CreateOnCampusLocation);
router.get("/api/bss-admin/GetAllOnCampusLocation", authorize(), upload.none(), configBssDb(), SettingController.GetAllOnCampusLocation);
router.get("/api/bss-admin/GetOnCampusLocationById", authorize(), upload.none(), configBssDb(), SettingController.GetOnCampusLocationById);
router.put("/api/bss-admin/UpdateOnCampusLocationDetails", authorize(), upload.none(), configBssDb(), SettingController.UpdateOnCampusLocationDetails);
router.put("/api/bss-admin/UpdateOnCampusLocationStatus", authorize(), upload.none(), configBssDb(), SettingController.UpdateOnCampusLocationStatus);
router.delete("/api/bss-admin/DeleteOnCampusLocation", authorize(), upload.none(), configBssDb(), SettingController.DeleteOnCampusLocation);
router.get("/api/bss-admin/GetOnCampusLocationsList", authorize(), upload.none(), configBssDb(), SettingController.GetOnCampusLocationsList);

router.post("/api/bss-admin/CreateEventCalendar", authorize(), upload.none(), configBssDb(), SettingController.CreateEventCalendar);
router.get("/api/bss-admin/GetEventCalendarDetailsById", authorize(), upload.none(), configBssDb(), SettingController.GetEventCalendarDetailsById);
router.get("/api/bss-admin/GetAllEventCalendarDetails", authorize(), upload.none(), configBssDb(), SettingController.GetAllEventCalendarDetails);
router.put("/api/bss-admin/UpdateEventCalendarDetails", authorize(), upload.none(), configBssDb(), SettingController.UpdateEventCalendarDetails);
router.delete("/api/bss-admin/DeleteEventCalendarDetails", authorize(), upload.none(), configBssDb(), SettingController.DeleteEventCalendarDetails);

router.post("/api/bss-admin/CreateOrUpdateRollCall", authorize(), upload.none(), configBssDb(), SettingController.CreateOrUpdateRollCall);
router.get("/api/bss-admin/GetRollCallDetails", authorize(), upload.none(), configBssDb(), SettingController.GetRollCallDetails);

router.post('/api/bss-admin/CreateRole', authorize(), upload.none(), configBssDb(), SettingController.CreateRole);
router.get('/api/bss-admin/GetAllRoleList', authorize(), upload.none(), configBssDb(), SettingController.GetAllRoleList);
router.put('/api/bss-admin/UpdateRole', authorize(), upload.none(), configBssDb(), SettingController.UpdateRole);
router.get('/api/bss-admin/GetRoleById', authorize(), upload.none(), configBssDb(), SettingController.GetRoleById);
router.get('/api/bss-admin/GetAllRoleDetails', authorize(), upload.none(), configBssDb(), SettingController.GetAllRoleDetails);
router.post('/api/bss-admin/createDargId', authorize(), upload.none(), configBssDb(), SettingController.createDargId);

router.post('/api/bss-admin/CreateOrUpdateRolePermissions', authorize(), upload.none(), configBssDb(), SettingController.CreateOrUpdateRolePermissions);
router.get('/api/bss-admin/GetPermissionsByRoleId', authorize(), upload.none(), configBssDb(), SettingController.GetPermissionsByRoleId);
router.put('/api/bss-admin/UpdateRoleStatus', authorize(), upload.none(), configBssDb(), SettingController.UpdateRoleStatus);



/******************* SnapShoot Routes *******************/
// https://bssnew.dikonia.in/api/bss-admin/GetAllSnapshotStudents
router.get("/api/bss-admin/GetAllSnapshotStudents", authorize(), upload.none(), configBssDb(), SnapshotController.GetAllSnapshotStudents);

router.post("/api/bss-admin/SignInStudentReasonOrOncampus", authorize(), upload.none(), configBssDb(), SnapshotController.SignInStudentReasonOrOncampus);
router.put("/api/bss-admin/SignOutStudentReasonOrOncampus", authorize(), upload.none(), configBssDb(), SnapshotController.SignOutStudentReasonOrOncampus);
router.put("/api/bss-admin/SnapshotSignInOrSignOutStudents", authorize(), upload.none(), configBssDb(), SnapshotController.SnapshotSignInOrSignOutStudents);

router.get("/api/bss-admin/GetAllDormitoryListForSnapshot", authorize(), upload.none(), configBssDb(), SnapshotController.GetAllDormitoryListForSnapshot);
router.get("/api/bss-admin/GetAllClassesListForSnapshot", authorize(), upload.none(), configBssDb(), SnapshotController.GetAllClassesListForSnapshot);


router.get("/api/bss-admin/ExportStudentLocationHistoryPdf", authorize(), upload.none(), configBssDb(), SnapshotController.ExportStudentLocationHistoryPdf);

router.get("/api/bss-admin/GetStudentAndOtherdetailsById", authorize(), upload.none(), configBssDb(), SnapshotController.GetStudentAndOtherdetailsById);
router.get("/api/bss-admin/GetStudentDiaryCommentsById", authorize(), upload.none(), configBssDb(), SnapshotController.GetStudentDiaryCommentsById);
router.put("/api/bss-admin/UpdateSnapshotRollCallCompareStatus",authorize(),upload.none(),configBssDb(),SnapshotController.UpdateSnapshotRollCallCompareStatus);


    /**************** Student Dashoboard Routes ***********************/
router.get("/api/bss-admin/GetStudentsBirthdayDetails", authorize(), upload.none(), configBssDb(), StudentDashboardController.GetStudentsBirthdayDetails);
router.post("/api/bss-admin/CreateOperationalComment", authorize(), upload.none(), configBssDb(), StudentDashboardController.CreateOperationalComment);
router.get("/api/bss-admin/GetAllOperationalComments", authorize(), upload.none(), configBssDb(), StudentDashboardController.GetAllOperationalComments);
router.post("/api/bss-admin/CreateDiaryMedicalComment", authorize(), upload.none(), configBssDb(), StudentDashboardController.CreateDiaryMedicalComment);
router.get("/api/bss-admin/GetAllDiaryMedicalComments", authorize(), upload.none(), configBssDb(), StudentDashboardController.GetAllDiaryMedicalComments);
router.post("/api/bss-admin/CreateDiaryPastoralComments", authorize(), upload.none(), configBssDb(), StudentDashboardController.CreateDiaryPastoralComments);
router.get("/api/bss-admin/GetAllDiaryPastoralComments", authorize(), upload.none(), configBssDb(), StudentDashboardController.GetAllDiaryPastoralComments);
router.get("/api/bss-admin/GetAllStudentListForDiaryComments", authorize(), upload.none(), configBssDb(), StudentDashboardController.GetAllStudentListForDiaryComments);
router.get("/api/bss-admin/GetDashboardStudentsMedicalIssued", authorize(), upload.none(), configBssDb(), StudentDashboardController.GetDashboardStudentsMedicalIssued);
router.get("/api/bss-admin/ExportMedicalIssuedStudentsPdf", authorize(), upload.none(), configBssDb(), StudentDashboardController.ExportMedicalIssuedStudentsPdf);
router.get("/api/bss-admin/GetAllClassStudentsCountForChart", authorize(), upload.none(), configBssDb(), StudentDashboardController.GetAllClassStudentsCountForChart);
router.get("/api/bss-admin/GetUserAttendanceCountForChart", authorize(), upload.none(), configBssDb(), StudentDashboardController.GetUserAttendanceCountForChart);
router.get("/api/bss-admin/GetWeeklyAttendanceCountForChart", authorize(), upload.none(), configBssDb(), StudentDashboardController.GetWeeklyAttendanceCountForChart);
router.get("/api/bss-admin/GetWeeklyAbsentReasonForChart", authorize(), upload.none(), configBssDb(), StudentDashboardController.GetWeeklyAbsentReasonForChart);
router.get("/api/bss-admin/GetAllDashboardDiscadedAttendance", authorize(), upload.none(), configBssDb(), StudentDashboardController.GetAllDashboardDiscadedAttendance);


/******************** Roll Call Routes ********************/
router.get("/api/bss-admin/GetAllStudentsforConductRollCall", authorize(), upload.none(), configBssDb(), RollCallController.GetAllStudentsforConductRollCall);
router.get("/api/bss-admin/GetAllReasonsAndCampusLocations", authorize(), upload.none(), configBssDb(), RollCallController.GetAllReasonsAndCampusLocations);
router.post("/api/bss-admin/CreateStudentsConductRollCall", authorize(), upload.none(), configBssDb(), RollCallController.CreateStudentsConductRollCall);
router.get("/api/bss-admin/GetStudentsRollCallReport", authorize(), upload.none(), configBssDb(), RollCallController.GetStudentsRollCallReport);
router.get("/api/bss-admin/ExportStudentsAttendancePdf", authorize(), upload.none(), configBssDb(), RollCallController.ExportStudentsAttendancePdf);
router.post("/api/bss-admin/CreateRollCallSessionDiscard", authorize(), upload.none(), configBssDb(), RollCallController.CreateRollCallSessionDiscard);

/****************** Leave Setting Routes *****************/
router.post("/api/Bss-admin/CreateActivity", authorize(), upload.none(), configBssDb(), LeaveSettingController.CreateActivity);
router.get("/api/Bss-admin/GetAllActivity", authorize(), upload.none(), configBssDb(), LeaveSettingController.GetAllActivity);
router.get("/api/Bss-admin/GetActivityById", authorize(), upload.none(), configBssDb(), LeaveSettingController.GetActivityById);
router.put("/api/Bss-admin/UpdateActivity", authorize(), upload.none(), configBssDb(), LeaveSettingController.UpdateActivity);
router.put("/api/Bss-admin/UpdateActivityStatus", authorize(), upload.none(), configBssDb(), LeaveSettingController.UpdateActivityStatus);
router.delete("/api/Bss-admin/DeleteActivity", authorize(), upload.none(), configBssDb(), LeaveSettingController.DeleteActivity);

router.post("/api/Bss-admin/CreateTravelMode", authorize(), upload.none(), configBssDb(), LeaveSettingController.CreateTravelMode);
router.get("/api/Bss-admin/GetAllTravelModes", authorize(), upload.none(), configBssDb(), LeaveSettingController.GetAllTravelModes);
router.get("/api/Bss-admin/GetTravelModeById", authorize(), upload.none(), configBssDb(), LeaveSettingController.GetTravelModeById);
router.put("/api/Bss-admin/UpdateTravelMode", authorize(), upload.none(), configBssDb(), LeaveSettingController.UpdateTravelMode);
router.put("/api/Bss-admin/UpdateTravelModeStatus", authorize(), upload.none(), configBssDb(), LeaveSettingController.UpdateTravelModeStatus);
router.delete("/api/Bss-admin/DeleteTravelMode", authorize(), upload.none(), configBssDb(), LeaveSettingController.DeleteTravelMode);

router.post("/api/Bss-admin/CreateLeaveRejectReason", authorize(), upload.none(), configBssDb(), LeaveSettingController.CreateLeaveRejectReason);
router.get("/api/Bss-admin/GetAllLeaveRejectReasons", authorize(), upload.none(), configBssDb(), LeaveSettingController.GetAllLeaveRejectReasons);
router.get("/api/Bss-admin/GetLeaveRejectReasonById", authorize(), upload.none(), configBssDb(), LeaveSettingController.GetLeaveRejectReasonById);
router.put("/api/Bss-admin/UpdateLeaveRejectReason", authorize(), upload.none(), configBssDb(), LeaveSettingController.UpdateLeaveRejectReason);
router.put("/api/Bss-admin/UpdateLeaveRejectStatus", authorize(), upload.none(), configBssDb(), LeaveSettingController.UpdateLeaveRejectStatus);
router.delete("/api/Bss-admin/DeleteLeaveRejectReason", authorize(), upload.none(), configBssDb(), LeaveSettingController.DeleteLeaveRejectReason);

router.get("/api/bss-admin/GetAllStudentsHost", authorize(), upload.none(), configBssDb(), LeaveSettingController.GetAllStudentsHost);
router.put("/api/bss-admin/ApproveHost", authorize(), upload.none(), configBssDb(), LeaveSettingController.ApproveHost);
router.put("/api/bss-admin/UpdateStudentHostStatus", authorize(), upload.none(), configBssDb(), LeaveSettingController.UpdateStudentHostStatus);

/*******************Liberty(parent and students) Mobile Routes******************************/
/******************* Auth Routes(Parents) ******************************/
router.post("/api/mobile-liberty/LoginStudentLiberty", upload.none(), LibertyAuthController.LoginStudentLiberty);
router.post("/api/mobile-liberty/LoginParentLiberty", upload.none(), LibertyAuthController.LoginParentLiberty);

router.post("/api/mobile-liberty/ForgotStudentPassword", upload.none(), LibertyAuthController.ForgotStudentPassword);
router.post("/api/mobile-liberty/ForgotParentPassword", upload.none(), LibertyAuthController.ForgotParentPassword);

/* Liberty parent and Student Routes */
router.get("/api/mobile-liberty/GetStudentProfile", configBssDb(), upload.none(), mobileLibertyAuthorize(), LibertyStudentAndParentController.GetStudentProfile);
router.put("/api/mobile-liberty/ChangeStudentOrParentPassword", configBssDb(), upload.none(), mobileLibertyAuthorize(), LibertyStudentAndParentController.ChangeStudentOrParentPassword);

/* Liberty Student Routes*/
router.post("/api/mobile-liberty/AddOrUpdateStudentNotes", configBssDb(), upload.none(), mobileLibertyAuthorize(), LibertyStudentController.AddOrUpdateStudentNotes);
router.get("/api/mobile-liberty/GetAllNotesOfStudent", configBssDb(), upload.none(), mobileLibertyAuthorize(), LibertyStudentController.GetAllNotesOfStudent);
router.get("/api/mobile-liberty/GetStudentNotesById", configBssDb(), upload.none(), mobileLibertyAuthorize(), LibertyStudentController.GetStudentNotesById);
router.delete("/api/mobile-liberty/DeleteStudentNote", configBssDb(), upload.none(), mobileLibertyAuthorize(), LibertyStudentController.DeleteStudentNote);

router.post("/api/mobile-liberty/AddWallet", configBssDb(), upload.any(), mobileLibertyAuthorize(), LibertyStudentController.AddWallet);
router.get("/api/mobile-liberty/GetAllStudentWallet", configBssDb(), upload.any(), mobileLibertyAuthorize(), LibertyStudentController.GetAllStudentWallet);
// router.get("/api/bss-admin/GetAllStudentss",authorize(), upload.none(), configBssDb(),StudentController.GetAllStudents);

//Reports card
router.get("/api/bss-admin/BssHostReport",authorize(), configBssDb(), upload.any(), ReportsController.BssHostReport);
router.get("/api/bss-admin/BssStudentHostReport",authorize(), configBssDb(), upload.any(), ReportsController.BssStudentHostReport);

//allergic Report
router.get("/api/bss-admin/GenerateAllergicReport",authorize(), configBssDb(), upload.any(), ReportsController.GenerateAllergicReport);
router.get("/api/bss-admin/HostConnectedToStudentsReport",authorize(), configBssDb(), upload.any(), ReportsController.HostConnectedToStudentsReport);
// router.get("/api/bss-admin/WeeelyAttendanceReasonsChart",authorize(),configBssDb(), upload.any(), ReportsController.WeeklyAttendanceReasonsChart);
router.get("/api/bss-admin/WeekwiseAttendanceReasonsChart",authorize(), configBssDb(), upload.any(), ReportsController.WeekwiseAttendanceReasonsChart);

// router.post("/api/bss-admin/markAttendence",authorize(), configBssDb(), upload.any(), ReportsController.markAttendence);
router.delete("/api/bss-admin/ResetAllReasonsdata",authorize(), configBssDb(), upload.any(), ReportsController.ResetAllReasonsdata);
router.get("/api/bss-admin/PdfAndCsvFileOfHost",authorize(), configBssDb(), upload.any(), ReportsController.PdfAndCsvFileOfHost);
router.get("/api/bss-admin/GetStudentAttandenceById",authorize(), configBssDb(), upload.any(), ReportsController.GetStudentAttandenceById);

module.exports = router;