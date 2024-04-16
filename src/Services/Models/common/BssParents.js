const Sq = require("sequelize");
module.exports = async (sequelize2) => {

    const BssParentAddress = require("./BssParentAddress");
    const BssStudentHost = require("./BssStudentHost");

    const BssParents = sequelize2.define("bss_parents", {

        parent_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        parent_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },

        father_name: { type: Sq.STRING(255), },
        father_email: { type: Sq.STRING.BINARY, allowNull: false },
        father_phone: { type: Sq.STRING.BINARY, allowNull: false },
        father_username: { type: Sq.STRING.BINARY, },
        father_password: Sq.STRING,
        father_home_phone: { type: Sq.STRING.BINARY, allowNull: false },
        father_work_phone: { type: Sq.STRING.BINARY, allowNull: false },

        mother_name: { type: Sq.STRING(255), },
        mother_email: { type: Sq.STRING.BINARY, allowNull: false },
        mother_phone: { type: Sq.STRING.BINARY, allowNull: false },
        mother_username: { type: Sq.STRING.BINARY, },
        mother_password: Sq.STRING,
        mother_home_phone: { type: Sq.STRING.BINARY, allowNull: false },
        mother_work_phone: { type: Sq.STRING.BINARY, allowNull: false },
        salutation: { type: Sq.STRING.BINARY, allowNull: false },
        parent_device_name: Sq.TEXT,
        parent_device_token: Sq.TEXT,

        created_by: Sq.INTEGER,
        updated_by: Sq.INTEGER,
        deleted_by: Sq.INTEGER,

        created_date: { type: Sq.DATE, allowNull: true },
        updated_date: { type: Sq.DATE, allowNull: true },
        deleted_date: { type: Sq.DATE, allowNull: true },
    },
        {
            indexes: [
                {
                    unique: false,
                    fields: ['father_email', "mother_email"]
                }
            ],
            paranoid: false,
            timestamps: true,
            freezeTableName: true,
            schema: "common",
            createdAt: "created_date",
            updatedAt: "updated_date",
            deletedAt: "deleted_date",
            defaultScope: {
                attributes: { exclude: ["father_password", "mother_password"] },
            },
            scopes: {
                withPassword: { attributes: {} },
            },

        }
    )
    BssParents.beforeCreate(async (bssParents, options) => {

        bssParents.father_email = Sq.fn("PGP_SYM_ENCRYPT ", bssParents?.father_email ? bssParents.father_email : "", PG_ENCRYPT_KEY);
        bssParents.father_phone = Sq.fn("PGP_SYM_ENCRYPT ", bssParents?.father_phone ? bssParents?.father_phone : "", PG_ENCRYPT_KEY);
        bssParents.father_home_phone = Sq.fn("PGP_SYM_ENCRYPT ", bssParents?.father_home_phone ? bssParents.father_home_phone : "", PG_ENCRYPT_KEY);
        bssParents.father_work_phone = Sq.fn("PGP_SYM_ENCRYPT ", bssParents?.father_work_phone ? bssParents.father_work_phone : "", PG_ENCRYPT_KEY);

        bssParents.mother_email = Sq.fn("PGP_SYM_ENCRYPT ", bssParents?.mother_email ? bssParents.mother_email : "", PG_ENCRYPT_KEY);
        bssParents.mother_phone = Sq.fn("PGP_SYM_ENCRYPT ", bssParents?.mother_phone ? bssParents.mother_phone : "", PG_ENCRYPT_KEY);
        bssParents.mother_home_phone = Sq.fn("PGP_SYM_ENCRYPT ", bssParents?.mother_home_phone ? bssParents.mother_home_phone : "", PG_ENCRYPT_KEY);
        bssParents.mother_work_phone = Sq.fn("PGP_SYM_ENCRYPT ", bssParents?.mother_work_phone ? bssParents.mother_work_phone : "", PG_ENCRYPT_KEY);
        bssParents.salutation = Sq.fn("PGP_SYM_ENCRYPT ", bssParents?.salutation ? bssParents.salutation : "", PG_ENCRYPT_KEY);
    });

    BssParents.beforeUpdate(async (bssParents, options) => {

        bssParents.father_email = Sq.fn("PGP_SYM_ENCRYPT ", bssParents?.father_email ? bssParents.father_email : "", PG_ENCRYPT_KEY);
        bssParents.father_phone = Sq.fn("PGP_SYM_ENCRYPT ", bssParents?.father_phone ? bssParents.father_phone : "", PG_ENCRYPT_KEY);
        bssParents.father_home_phone = Sq.fn("PGP_SYM_ENCRYPT ", bssParents?.father_home_phone ? bssParents.father_home_phone : "", PG_ENCRYPT_KEY);
        bssParents.father_work_phone = Sq.fn("PGP_SYM_ENCRYPT ", bssParents?.father_work_phone ? bssParents.father_work_phone : "", PG_ENCRYPT_KEY);
        bssParents?.father_username ? bssParents.father_username = Sq.fn("PGP_SYM_ENCRYPT ", bssParents.father_username, PG_ENCRYPT_KEY) : ""

        bssParents.mother_email = Sq.fn("PGP_SYM_ENCRYPT ", bssParents?.mother_email ? bssParents?.mother_email : "", PG_ENCRYPT_KEY);
        bssParents.mother_phone = Sq.fn("PGP_SYM_ENCRYPT ", bssParents?.mother_phone ? bssParents?.mother_phone : "", PG_ENCRYPT_KEY);
        bssParents.mother_home_phone = Sq.fn("PGP_SYM_ENCRYPT ", bssParents?.mother_home_phone ? bssParents.mother_home_phone : "", PG_ENCRYPT_KEY);
        bssParents.mother_work_phone = Sq.fn("PGP_SYM_ENCRYPT ", bssParents?.mother_work_phone ? bssParents.mother_work_phone : "", PG_ENCRYPT_KEY);
        bssParents?.mother_username ? bssParents.mother_username = Sq.fn("PGP_SYM_ENCRYPT ", bssParents.mother_username, PG_ENCRYPT_KEY) : ""
        bssParents.salutation = Sq.fn("PGP_SYM_ENCRYPT ", bssParents?.salutation ? bssParents.salutation : "", PG_ENCRYPT_KEY);

    });

    BssParents.beforeFind(async (bssParents, options) => {

        bssParents.attributes = [
            "father_name", "mother_name", "parent_id", "parent_uuid",
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('father_email'), PG_ENCRYPT_KEY), "father_email"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('father_phone'), PG_ENCRYPT_KEY), "father_phone"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('father_home_phone'), PG_ENCRYPT_KEY), "father_home_phone"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('father_work_phone'), PG_ENCRYPT_KEY), "father_work_phone"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('mother_email'), PG_ENCRYPT_KEY), "mother_email"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('mother_phone'), PG_ENCRYPT_KEY), "mother_phone"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('mother_home_phone'), PG_ENCRYPT_KEY), "mother_home_phone"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('mother_work_phone'), PG_ENCRYPT_KEY), "mother_work_phone"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('father_username'), PG_ENCRYPT_KEY), "father_username"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('mother_username'), PG_ENCRYPT_KEY), "mother_username"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('salutation'), PG_ENCRYPT_KEY), "salutation"],
        ];
    });
    BssParents.hasMany(await BssParentAddress(sequelize2), {
        as: "parent_address",
        foreignKey: "parent_id"

    });
    BssParents.hasMany(await BssStudentHost(sequelize2), {
        as: "parents_as_host",
        foreignKey: "parent_id"

    });

    return BssParents;
};