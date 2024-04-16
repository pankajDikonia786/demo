const Sq = require("sequelize");
const bcrypt = require("bcrypt");
const { BssStudents, BssParents, BssDormitories, BssStudentWallet,BssStudentNotes } = require("../../Models/common");

module.exports.AddOrUpdateStudentNotes = async (req, res) => {

    try {
        const config_sequelize = req.config_sequelize;
        const liberty_login_user = req.liberty_login_user;
        const noteData = req.body;
        const { student_note_uuid } = noteData;
        delete noteData.student_note_uuid;

        const StudentNotesModel = await BssStudentNotes(config_sequelize);

        if (student_note_uuid) {
            noteData.updated_by = liberty_login_user.student_id;
            await StudentNotesModel.update(noteData, {
                where: { student_note_uuid }
            });
            res.json({
                status: 200,
                success: true,
                message: `Notes updated successfully!`
            });
        } else {
            noteData.created_by = liberty_login_user.student_id;
            await StudentNotesModel.create(noteData);
            res.json({
                status: 200,
                success: true,
                message: `Note added successfully!`
            });
        };
    } catch (error) {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            message: `Something went wrong. Please try again or reach out to support if the issue persists.`
        });
    }
};
//liberty student only
module.exports.GetAllNotesOfStudent = async (req, res) => {

    const config_sequelize = req.config_sequelize
    const { page, limit, order, sort, student_id } = req.query;

    const query_data = {};
    if (page && limit) {
        query_data.limit = limit;
        query_data.offset = 0 + (page - 1) * limit;

    };

    if (sort && order) {
        query_data.order = [[sort, order]]
    };

    const studentNotesModel = await BssStudentNotes(config_sequelize);
    try {
        const studentNotesRes = await studentNotesModel.findAndCountAll(
            {
                where: { student_id: student_id },
                attributes: ["student_note_uuid", "student_note_id",
                    "note_title", "note_desc", "created_date", "updated_date"
                ], ...query_data
            });

        res.json({
            status: 200,
            success: true,
            data: studentNotesRes,
            message: "Get All notes successfully!"
        });

    } catch (error) {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            message: `Something went wrong. Please try again or reach out to support if the issue persists.`
        });

    };

};
module.exports.GetStudentNotesById = async (req, res) => {
    const config_sequelize = req.config_sequelize
    const { student_note_id } = req.query;

    const StudentNotesModel = await BssStudentNotes(config_sequelize);
    try {
        const studentNotesRes = await StudentNotesModel.findAndCountAll(
            {
                where: { student_note_id: student_note_id }
            });

        res.json({
            status: 200,
            success: true,
            data: studentNotesRes,
            message: "Get notes by id successfully!"
        });

    } catch (error) {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            message: `Something went wrong. Please try again or reach out to support if the issue persists.`
        });

    };

};
module.exports.DeleteStudentNote = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const { student_note_id } = req.body;

    const StudentNotesModel = await BssStudentNotes(config_sequelize);
    try {
        await StudentNotesModel.destroy({
            where: { student_note_id }
        });
        res.json({
            status: 200,
            success: true,
            message: `Notes deleted successfully!`
        });

    } catch (error) {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: `Something went wrong. Please try again or reach out to support if the issue persists.`
        });
    };

};

//Wallet
module.exports.AddWallet = async (req, res) => {
    try {
        const config_sequelize = req.config_sequelize;

        const fileData = req.files;
        const { student_id } = req.body;

        let uploadDetails = {};
        uploadDetails.student_id = student_id;
        uploadDetails.created_by = student_id;

        const StudentWalletModel = await BssStudentWallet(config_sequelize);

        if (fileData) {
            fileData.forEach(async (file) => {
                uploadDetails.files = file.path;
                const type_check = file.mimetype.split('/')[0];

                if (type_check === 'image') {
                    uploadDetails.file_type = 'image';
                } else if (type_check === 'video') {
                    uploadDetails.file_type = 'video';
                } else {
                    uploadDetails.file_type = 'document';
                };
                await StudentWalletModel.create(uploadDetails);

            });
        };
        res.json({
            success: true,
            status: 200,
            message: "Wallet Added successfully!",
        });
    } catch (error) {
          console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists"
        });

    };
};

module.exports.GetAllStudentWallet = async (req, res) => {
    try {
        const config_sequelize = req.config_sequelize;

        const { student_id, page, limit, sort, order, file_type } = req.query;

        let where_data = {};
        let query_data = {};

        if (file_type) {
            where_data = {
                ...where_data,
                file_type: file_type
            }
        };

        if (page && limit) {
            query_data.offset = 0 + (page - 1) * limit;
            query_data.limit = limit;
        };
        if (sort && order) {
            query_data.order = [[sort, order]]
        };

        const StudentWalletModel = await BssStudentWallet(config_sequelize);

        const studetnWalletRes = await StudentWalletModel.findAndCountAll({
            where: { ...where_data, student_id },
            attributes: ["student_wallet_uuid", "student_id", "file_type", "files", "created_date"],
            ...query_data,
        });

        res.json({
            status: 200,
            success: true,
            data: studetnWalletRes,
            message: "Get student wallet successfully!"
        });

    } catch (error) {
        res.json({
            status: 400,
            success:false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });
    };
};


//Delete Wallet Card listing

module.exports.DeleteWalletCard = async (req, res) => {
    const config_sequelize = req.config_sequelize
    const login_user = req.login_user
    const { student_wallet_uuid } = req.body

    const studentWalletModel = await BssStudentWallet(config_sequelize)

    studentWalletModel.destroy({
        where: {
            student_wallet_uuid
        }
    }).then(() => {
        res.json({
            status: 200,
            success: true,
            message: `Wallet data Deleted successfully!`
        })

    }).catch((error) => {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists!"
        })

    })

};




