
module.exports = async (sequelize2) => {
    const Sq = require("sequelize");
    const BssDormitoryUsers = require("./BssDormitoryUsers");
    const BssUsers = require("./BssUsers");

    const BssDormitories = sequelize2.define("bss_dormitories", {

        dormitory_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        dormitory_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },

        school_detail_id: Sq.INTEGER,
        dormitory_name: { type: Sq.STRING.BINARY, allowNull: false },
        dormitory_type: {
            type: Sq.ENUM, values: ['boy', 'girl', 'both'],
            allowNull: false,
        },

        bio_note: { type: Sq.STRING.BINARY, allowNull: false, },
        dormitory_image: Sq.TEXT,
        dormitory_status: { type: Sq.BOOLEAN, defaultValue: true },

        created_by: Sq.INTEGER,
        updated_by: Sq.INTEGER,
        deleted_by: Sq.INTEGER,
        //for declare at the time model  sync() 
        // createdAt: { type: DataTypes.DATE, allowNull: true, field: "created_at" },
        // updatedAt: { type: DataTypes.DATE, allowNull: true, field: "updated_at" },
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
    )

    BssDormitories.belongsToMany(await BssUsers(sequelize2), {
        through: await BssDormitoryUsers(sequelize2),
        as: 'dormitory_users',
        constraints: false,
        allowNull: true,
        defaultValue: null,
        foreignKey: 'dormitory_id',
        otherKey: 'user_id'

    });



    BssDormitories.beforeCreate(async (bssDormitories, options) => {
        bssDormitories.dormitory_name = Sq.fn("PGP_SYM_ENCRYPT ", bssDormitories.dormitory_name, PG_ENCRYPT_KEY);
        bssDormitories.bio_note = Sq.fn("PGP_SYM_ENCRYPT ", bssDormitories.bio_note, PG_ENCRYPT_KEY);
    });

    BssDormitories.beforeFind(async (bssStudents, options) => {
        bssStudents.attributes = [
            "dormitory_id", "dormitory_uuid", "dormitory_type", "dormitory_image", "dormitory_status",
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('dormitory_name'), PG_ENCRYPT_KEY), "dormitory_name"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('bio_note'), PG_ENCRYPT_KEY), "bio_note"],
        ]

    })

    BssDormitories.beforeDestroy(async (bssDormitories, option) => {
        BssDormitories.update({
            deleted_by: option.login_user.user_id
        }, { paranoid: false, where: { dormitory_uuid: bssDormitories.dormitory_uuid } })

    })

    return BssDormitories;
}