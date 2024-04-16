const Sq = require("sequelize");
module.exports = async (sequelize2) => {
    const BssStudentHost = require("./BssStudentHost");

    const BssHost = sequelize2.define("bss_host", {

        host_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        host_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },

        host_name: { type: Sq.STRING(255), allowNull: false },
        host_email: { type: Sq.STRING.BINARY, allowNull: false },
        host_contact: { type: Sq.STRING.BINARY, allowNull: false },
        host_address: { type: Sq.STRING.BINARY, allowNull: false },

        remark_parents: Sq.TEXT,
        remark_boarding: Sq.TEXT,
        remark_host: Sq.TEXT,

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
                    fields: ['host_email']
                }
            ],
            paranoid: true,
            timestamps: true,
            freezeTableName: true,
            schema: "common",
            createdAt: "created_date",
            updatedAt: "updated_date",
            deletedAt: "deleted_date",

        }
    )

    BssHost.beforeCreate(async (bssHost, options) => {

        bssHost.host_email = Sq.fn("PGP_SYM_ENCRYPT ", bssHost?.host_email, PG_ENCRYPT_KEY);
        bssHost.host_contact = Sq.fn("PGP_SYM_ENCRYPT ", bssHost?.host_contact, PG_ENCRYPT_KEY);
        bssHost.host_address = Sq.fn("PGP_SYM_ENCRYPT ", bssHost?.host_address, PG_ENCRYPT_KEY);

    });
    BssHost.beforeUpdate(async (bssHost, options) => {
        bssHost.host_email = Sq.fn("PGP_SYM_ENCRYPT ", bssHost?.host_email, PG_ENCRYPT_KEY);
        bssHost.host_contact = Sq.fn("PGP_SYM_ENCRYPT ", bssHost?.host_contact, PG_ENCRYPT_KEY);
        bssHost.host_address = Sq.fn("PGP_SYM_ENCRYPT ", bssHost?.host_address, PG_ENCRYPT_KEY);
    });
    BssHost.beforeFind(async (bssHost, options) => {
        bssHost.attributes = [
            "host_uuid", "host_id", "host_name",
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('host_email'), PG_ENCRYPT_KEY), "host_email"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('host_contact'), PG_ENCRYPT_KEY), "host_contact"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('host_address'), PG_ENCRYPT_KEY), "host_address"],
             "remark_parents", "remark_boarding", "remark_host", "created_by"
        ]
    })
    BssHost.hasOne(await BssStudentHost(sequelize2),
        { as: "stu_host", foreignKey: "host_id" });
    return BssHost;
};