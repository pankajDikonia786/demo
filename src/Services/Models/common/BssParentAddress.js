
module.exports = async (sequelize2) => {
    const Sq = require("sequelize");

    const BssParentAddress = sequelize2.define("bss_parent_address", {

        parent_address_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        parent_address_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },

        parent_id: { type: Sq.INTEGER, allowNull: false },
        parent_address_type: { type: Sq.ENUM("mother", "father", "both"), allowNull: false },
        parent_country: { type: Sq.STRING },
        address_line1: { type: Sq.STRING.BINARY, allowNull: false },
        address_line2: { type: Sq.STRING.BINARY, allowNull: false },
        address_line3: { type: Sq.STRING.BINARY, allowNull: false },
        address_line4: { type: Sq.STRING.BINARY, allowNull: false },
        parent_postcode: { type: Sq.STRING.BINARY, allowNull: false },

        created_by: Sq.INTEGER,
        updated_by: Sq.INTEGER,
        deleted_by: Sq.INTEGER,

        created_date: { type: Sq.DATE, allowNull: true },
        updated_date: { type: Sq.DATE, allowNull: true },
        deleted_date: { type: Sq.DATE, allowNull: true },
    },
        {

            paranoid: false,
            timestamps: true,
            freezeTableName: true,
            schema: "common",
            createdAt: "created_date",
            updatedAt: "updated_date",
            deletedAt: "deleted_date",

        }
    );

    BssParentAddress.beforeCreate(async (bssParentAddress, options) => {
console.log("hook--------------------------")
        bssParentAddress.address_line1 = Sq.fn("PGP_SYM_ENCRYPT ", bssParentAddress?.address_line1 ? bssParentAddress.address_line1 : "", PG_ENCRYPT_KEY);
        bssParentAddress.address_line2 = Sq.fn("PGP_SYM_ENCRYPT ", bssParentAddress?.address_line2 ? bssParentAddress.address_line2 : "", PG_ENCRYPT_KEY);
        bssParentAddress.address_line3 = Sq.fn("PGP_SYM_ENCRYPT ", bssParentAddress?.address_line3 ? bssParentAddress.address_line3 : "", PG_ENCRYPT_KEY);
        bssParentAddress.address_line4 = Sq.fn("PGP_SYM_ENCRYPT ", bssParentAddress?.address_line4 ? bssParentAddress.address_line4 : "", PG_ENCRYPT_KEY);
        bssParentAddress.parent_postcode = Sq.fn("PGP_SYM_ENCRYPT ", bssParentAddress?.parent_postcode ? bssParentAddress.parent_postcode : "", PG_ENCRYPT_KEY);
        bssParentAddress.parent_country = bssParentAddress.parent_country.toLowerCase();
    });

    BssParentAddress.beforeUpdate(async (bssParentAddress, options) => {
console.log("update hook------------------------------")
        bssParentAddress.address_line1 = Sq.fn("PGP_SYM_ENCRYPT ", bssParentAddress?.address_line1 ? bssParentAddress.address_line1 : "", PG_ENCRYPT_KEY);
        bssParentAddress.address_line2 = Sq.fn("PGP_SYM_ENCRYPT ", bssParentAddress?.address_line2 ? bssParentAddress.address_line2 : "", PG_ENCRYPT_KEY);
        bssParentAddress.address_line3 = Sq.fn("PGP_SYM_ENCRYPT ", bssParentAddress?.address_line3 ? bssParentAddress.address_line3 : "", PG_ENCRYPT_KEY);
        bssParentAddress.address_line4 = Sq.fn("PGP_SYM_ENCRYPT ", bssParentAddress?.address_line4 ? bssParentAddress.address_line4 : "", PG_ENCRYPT_KEY);
        bssParentAddress.parent_postcode = Sq.fn("PGP_SYM_ENCRYPT ", bssParentAddress?.parent_postcode ? bssParentAddress.parent_postcode : "", PG_ENCRYPT_KEY);
        bssParentAddress.parent_country = bssParentAddress.parent_country.toLowerCase();
    });


    return BssParentAddress;
};