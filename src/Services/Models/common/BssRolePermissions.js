module.exports = async (sequelize2) => {
    const Sq = require("sequelize");
    const BssRolePermClassDorm = require("./BssRolePermClassDorm");
    const BssRolePermission = sequelize2.define("bss_role_permissions", {

        role_permission_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        role_permission_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },

        role_id: { type: Sq.INTEGER, allowNull: false },
        //app permission attributes
        head_check: { type: Sq.BOOLEAN, defaultValue: false },
        student_gender_all: { type: Sq.BOOLEAN, defaultValue: false },
        student_gender_male: { type: Sq.BOOLEAN, defaultValue: false },
        student_gender_female: { type: Sq.BOOLEAN, defaultValue: false },
        ////////////////////////////
        view_snapshot: { type: Sq.BOOLEAN, defaultValue: false },

        add_class: { type: Sq.BOOLEAN, defaultValue: false },
        edit_class: { type: Sq.BOOLEAN, defaultValue: false },
        view_class: { type: Sq.BOOLEAN, defaultValue: false },
        delete_class: { type: Sq.BOOLEAN, defaultValue: false },

        activate_deactivate_class: { type: Sq.BOOLEAN, defaultValue: false },

        add_student: { type: Sq.BOOLEAN, defaultValue: false },
        edit_student: { type: Sq.BOOLEAN, defaultValue: false },
        view_student: { type: Sq.BOOLEAN, defaultValue: false },
        delete_student: { type: Sq.BOOLEAN, defaultValue: false },
        activate_deactivate_student: { type: Sq.BOOLEAN, defaultValue: false },

        add_host: { type: Sq.BOOLEAN, defaultValue: false },
        edit_host: { type: Sq.BOOLEAN, defaultValue: false },
        view_host: { type: Sq.BOOLEAN, defaultValue: false },
        parents_approval_host: { type: Sq.BOOLEAN, defaultValue: false },
        activate_deactivate_host: { type: Sq.BOOLEAN, defaultValue: false },

        add_travel_mode: { type: Sq.BOOLEAN, defaultValue: false },
        edit_travel_mode: { type: Sq.BOOLEAN, defaultValue: false },
        view_travel_mode: { type: Sq.BOOLEAN, defaultValue: false },
        delete_travel_mode: { type: Sq.BOOLEAN, defaultValue: false },

        activate_deactivate_travel_mode: { type: Sq.BOOLEAN, defaultValue: false },
        add_rejection_reason: { type: Sq.BOOLEAN, defaultValue: false },
        edit_rejection_reason: { type: Sq.BOOLEAN, defaultValue: false },
        view_rejection_reason: { type: Sq.BOOLEAN, defaultValue: false },
        delete_rejection_reason: { type: Sq.BOOLEAN, defaultValue: false },
        activate_deactivate_rejection_reason: { type: Sq.BOOLEAN, defaultValue: false },

        add_weekend_leave: { type: Sq.BOOLEAN, defaultValue: false },
        view_weekend_leave: { type: Sq.BOOLEAN, defaultValue: false },
        edit_weekend_leave: { type: Sq.BOOLEAN, defaultValue: false },

        add_adhoc_leave: { type: Sq.BOOLEAN, defaultValue: false },
        view_adhoc_leave: { type: Sq.BOOLEAN, defaultValue: false },
        edit_adhoc_leave: { type: Sq.BOOLEAN, defaultValue: false },

        add_user: { type: Sq.BOOLEAN, defaultValue: false },
        view_user: { type: Sq.BOOLEAN, defaultValue: false },
        edit_user: { type: Sq.BOOLEAN, defaultValue: false },
        activate_deactivate_user: { type: Sq.BOOLEAN, defaultValue: false },

        add_dormitory: { type: Sq.BOOLEAN, defaultValue: false },
        edit_dormitory: { type: Sq.BOOLEAN, defaultValue: false },
        view_dormitory: { type: Sq.BOOLEAN, defaultValue: false },
        activate_deactivate_dormitory: { type: Sq.BOOLEAN, defaultValue: false },
        
        view_reports: { type: Sq.BOOLEAN, defaultValue: false },

        add_permission: { type: Sq.BOOLEAN, defaultValue: false },
        edit_permission: { type: Sq.BOOLEAN, defaultValue: false },
        view_permission: { type: Sq.BOOLEAN, defaultValue: false },

        view_message: { type: Sq.BOOLEAN, defaultValue: false },
        edit_message: { type: Sq.BOOLEAN, defaultValue: false },
        view_school_profile: { type: Sq.BOOLEAN, defaultValue: false },
        edit_school_profile: { type: Sq.BOOLEAN, defaultValue: false },
        create_tempid: { type: Sq.BOOLEAN, defaultValue: false },

        add_dorm_comment: { type: Sq.BOOLEAN, defaultValue: false },
        view_dorm_comment: { type: Sq.BOOLEAN, defaultValue: false },

        add_pastoral_comment: { type: Sq.BOOLEAN, defaultValue: false },
        view_pastoral_comment: { type: Sq.BOOLEAN, defaultValue: false },

        add_medical_comment: { type: Sq.BOOLEAN, defaultValue: false },
        view_medical_comment: { type: Sq.BOOLEAN, defaultValue: false },

        require_stu_access_pin: { type: Sq.BOOLEAN, defaultValue: false },
        student_kiosk_mode: { type: Sq.BOOLEAN, defaultValue: false },
        dis_stu_avatar_onsnapshot: { type: Sq.BOOLEAN, defaultValue: false },
        dis_male_female_shadow_snapshot: { type: Sq.BOOLEAN, defaultValue: false },

        snapshot_gender_male: { type: Sq.BOOLEAN, defaultValue: false },
        snapshot_gender_female: { type: Sq.BOOLEAN, defaultValue: false },
        snapshot_gender_both: { type: Sq.BOOLEAN, defaultValue: false },

        add_allergic_students: { type: Sq.BOOLEAN, defaultValue: false },
        view_allergic_students: { type: Sq.BOOLEAN, defaultValue: false },
        edit_allergic_students: { type: Sq.BOOLEAN, defaultValue: false },

        add_grounded_students: { type: Sq.BOOLEAN, defaultValue: false },
        view_grounded_students: { type: Sq.BOOLEAN, defaultValue: false },
        edit_grounded_students: { type: Sq.BOOLEAN, defaultValue: false },
        deactivate_grounded_students: { type: Sq.BOOLEAN, defaultValue: false },
        delete_grounded_students: { type: Sq.BOOLEAN, defaultValue: false },

        view_import_students: { type: Sq.BOOLEAN, defaultValue: false },
        view_duplicate_students: { type: Sq.BOOLEAN, defaultValue: false },
        view_change_dormitory: { type: Sq.BOOLEAN, defaultValue: false },

        view_message: { type: Sq.BOOLEAN, defaultValue: false },
        view_attendance_report: { type: Sq.BOOLEAN, defaultValue: false },
        view_custom_links: { type: Sq.BOOLEAN, defaultValue: false },
        view_rollover_students: { type: Sq.BOOLEAN, defaultValue: false },
        view_rollcall_session_time: { type: Sq.BOOLEAN, defaultValue: false },

        view_oncampus_details: { type: Sq.BOOLEAN, defaultValue: false },
        view_calendar: { type: Sq.BOOLEAN, defaultValue: false },

        add_flag_students: { type: Sq.BOOLEAN, defaultValue: false },
        view_flag_students: { type: Sq.BOOLEAN, defaultValue: false },
        edit_flag_students: { type: Sq.BOOLEAN, defaultValue: false },
        deactivate_flag_students: { type: Sq.BOOLEAN, defaultValue: false },
        delete_flag_students: { type: Sq.BOOLEAN, defaultValue: false },

        created_by: Sq.INTEGER,
        updated_by: Sq.INTEGER,
        deleted_by: Sq.INTEGER,

        created_date: { type: Sq.DATE, allowNull: true },
        updated_date: { type: Sq.DATE, allowNull: true },
        deleted_date: { type: Sq.DATE, allowNull: true },
    },
        {
            paranoid: true,
            timestamps: true,
            freezeTableName: true,
            schema: "common",
            createdAt: "created_date",
            updatedAt: "updated_date",
            deletedAt: "deleted_date",

        }
    );
    BssRolePermission.hasMany(await BssRolePermClassDorm(sequelize2),
        {
            foreignKey: "role_permission_id",
            constraints: false, allowNull: true, defaultValue: null
        });
    return BssRolePermission;
}


