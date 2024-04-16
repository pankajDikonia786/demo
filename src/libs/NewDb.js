const Sequelize = require("sequelize");
const bcrypt = require("bcrypt");
const pg = require("pg");

const { BssSchoolDetails, BssUsers, BssDormitories, BssClasses, BssStudents,BssStudentNotes,BssStudentWallet,
  BssParents,BssParentAddress, BssStudentAllergy, BssStudentGeneric, BssStudentGrounded, BssUserMessages, BssCustomLinks,
  BssOnCampusLocations, BssEventCalendar, BssDormitoryUsers, BssMasterSettings, BssStuReasonOncampus,
  BssDiaryComments, BssOperationalComments, BssStudentAttendance, BssAttendanceUsers, BssStuCurrrentLocation,
  BssActivity, BssLeaveRejectReasons, BssTravelMode,BssHost,BssAttendanceDiscarded,BssStudentHost,
  BssPermissionDetails, BssPermissionHistory, BssPermissionClassDorm,BssStuLocChangeNotifications,BssRole, BssRolePermissions, BssRolePermClassDorm } = require("../Services/Models/common")

module.exports.CreateOrUpdateSchoolDatabase = async (school_detail) => {
  let promise = new Promise(async (resolve, reject) => {
    const pool = new pg.Pool({
      user: 'postgres',
      host: school_detail.country_host,
      database: process.env.DB_NEW_DATABASE,
      password: process.env.DB_PASSWORD,
      port: '5432'
    });

    const now = await pool.query("SELECT NOW()");

    ///////////////Drope the database query start(for delete school api)///////////////
    if (school_detail.drop_database === true && school_detail.school_code) {

      return await pool.query(`

      DROP DATABASE IF EXISTS ${school_detail.school_code}  ;`, (err, res1) => {

        if (err) {
          console.log("Drop school database error", err)
          return reject(err);

        } else {

          return resolve()
        }
      });

    }
    ///////////////End Drope the database query ///////////////

    let bcryptedPassword = await bcrypt.hash(school_detail.password, 10);

    await pool.query(`CREATE DATABASE ${school_detail.school_code}`, (err, res1) => {
      if (err) {
        reject(err)
        console.log("New db create error", err)
      }

      console.log(err, res1);
      const newPool = new pg.Pool({
        user: 'postgres',
        host: school_detail.country_host,
        database: school_detail.school_code,
        password: process.env.DB_PASSWORD,
        port: '5432'
      });

      newPool.query
        (
          `CREATE SCHEMA common;
          CREATE EXTENSION IF NOT EXISTS pgcrypto;
            CREATE SCHEMA admin;
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
             CREATE TABLE common.bss_users(
              user_id integer,
              user_uuid UUID NOT NULL, 
              school_detail_id integer,
              school_code character varying(255),
              first_name character varying(255),
              last_name  character varying(255),
              email character varying(255),
              role_type integer,
                role_id integer,
              password character varying(255),
              avatar text,
              country_host character varying(255),
              contact_one  character varying(50),
              contact_two  character varying(50),
              is_user_activate boolean default true,
              designation  character varying(255),
              comment text,
              last_archived_date character varying(255),
              archived_note text,
              created_by integer,
              created_date timestamp without time zone,
              updated_by integer,
              updated_date timestamp without time zone,
              deleted_by integer,
              deleted_date timestamp without time zone,
               CONSTRAINT bss_users_pkey PRIMARY KEY (user_id,user_uuid)
                );
              
             CREATE TABLE common.bss_school_details(
              school_detail_id integer NOT NULL,
              school_detail_uuid UUID NOT NULL,       
              school_name text,
              school_code character varying(255),
              actual_school_code character varying(255),
              school_logo text,
              highest_class integer,
              country_host character varying(255),
              school_address text,
              zipcode character varying (50),
              timezone character varying (50),
              country character varying(255),
              country_id integer,
              country_code character varying(255),
              state character varying(255),
              state_id integer,
              city character varying(255),
              city_id integer,
              session_start_year character varying(255),
              session_end_year character varying(255),
              session_start_month character varying(255),
              session_end_month character varying(255),            
              weekend_day_from character varying(255),
              weekend_day_to character varying(255),
              weekend_time_from character varying(255),
              weekend_time_to character varying(255),
              cut_off_day character varying(255),
              cut_off_time character varying(255), 
              is_school_activate boolean default true,   
             created_by integer,
             created_date timestamp with time zone,
             updated_by integer,
             updated_date timestamp with time zone,
             deleted_by integer,
             deleted_date timestamp with time zone,
             CONSTRAINT school_details_pkey PRIMARY KEY (school_detail_id,school_detail_uuid)
             );
             
             CREATE TABLE common.bss_reasons(
              reason_id integer NOT NULL  GENERATED ALWAYS AS IDENTITY ( CYCLE INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
              reason_uuid UUID NOT NULL DEFAULT uuid_generate_v4(), 
              reason_name character varying(255),
              created_by integer,
              created_date timestamp without time zone,
               CONSTRAINT bss_reasons_pkey PRIMARY KEY (reason_id,reason_uuid)
                );
                INSERT INTO common.bss_reasons(
                  reason_name, 
                  created_date 
                  )VALUES
                  ('MIA','NOW()'),('SL','NOW()'),('KL','NOW()'),('On Campus','NOW()');

             INSERT INTO common.bss_school_details(
              school_detail_id,school_detail_uuid,
              school_name, school_code,actual_school_code,country_host,school_logo,
              highest_class,school_address,zipcode,timezone,country,country_id,
              country_code,state,state_id,city,city_id,session_start_year,session_end_year,
              session_start_month,session_end_month,created_date
              ) VALUES (
                
        '${school_detail.school_detail_id}',
        '${school_detail.school_detail_uuid}',
        '${school_detail.school_name}',
        '${school_detail.school_code}',
        '${school_detail.actual_school_code}',
        '${school_detail.country_host}',
        '${school_detail.school_logo}',
        '${school_detail.highest_class}',
        '${school_detail.school_address}',
        '${school_detail.zipcode}',
        '${school_detail.timezone}',
        '${school_detail.country}',
        '${school_detail.country_id}',
        '${school_detail.country_code}',
        '${school_detail.state}',
        '${school_detail.state_id}',
        '${school_detail.city}',
        '${school_detail.city_id}',
        '${school_detail.session_start_year}',
        '${school_detail.session_end_year}',
        '${school_detail.session_start_month}',
        '${school_detail.session_end_month}',
        'NOW()'
       );
       INSERT INTO common.bss_users(
        user_id,user_uuid,school_detail_id,school_code,country_host,first_name,last_name,
        email,contact_one,contact_two,avatar,role_type,password,created_date 
        )
         VALUES ('${school_detail.user_id}','${school_detail.user_uuid}','${school_detail.school_detail_id}',
          '${school_detail.school_code}','${school_detail.country_host}','${school_detail.first_name}',
           '${school_detail.last_name}','${school_detail.email}','${school_detail.contact_one}',
           '${school_detail.contact_two}','${school_detail.avatar}', 2,'${bcryptedPassword}',
           'NOW()') `,
          (err, res2) => {
            if (err) {
              reject(err)
            } else {

              resolve(res2)
            }
            console.log(err, res2);
            newPool.end();
          }
        );
    });
  })
  return promise
}

let configNewDb = async (school_detail) => {
  let sequelize2 = new Sequelize(school_detail.school_code,
    process.env.DB_USERNAME,
    process.env.DB_PASSWORD,
    {
      host: school_detail.country_host,
      dialect: "postgres",
       pool: {
            max: 100,    
            min: 0,     
            acquire: 20000, 
            idle: 10000, 
            evict: 10000,

        }


    });
if (school_detail?.sync_db !== false) {
  BssSchoolDetails(sequelize2);
  BssUsers(sequelize2);
  BssDormitories(sequelize2);
  BssClasses(sequelize2);
  BssStudentAllergy(sequelize2);
  BssStudentGeneric(sequelize2);
  BssStudentGrounded(sequelize2);
  BssParents(sequelize2);
  BssParentAddress(sequelize2);
  BssStudents(sequelize2);
  BssStudentNotes(sequelize2);
  BssStudentWallet(sequelize2);
  BssUserMessages(sequelize2);
  BssCustomLinks(sequelize2);
  BssOnCampusLocations(sequelize2);
  BssEventCalendar(sequelize2);
  BssDormitoryUsers(sequelize2);
  BssMasterSettings(sequelize2);
  BssStuReasonOncampus(sequelize2);
  BssOperationalComments(sequelize2);
  BssDiaryComments(sequelize2);
  BssStudentAttendance(sequelize2);
  BssAttendanceUsers(sequelize2);
  BssStuCurrrentLocation(sequelize2);
  BssActivity(sequelize2);
  BssLeaveRejectReasons(sequelize2);
  BssTravelMode(sequelize2);
  BssHost(sequelize2);
  BssAttendanceDiscarded(sequelize2);
  BssStudentHost(sequelize2);
  BssPermissionDetails(sequelize2);
  BssPermissionHistory(sequelize2);
  BssPermissionClassDorm(sequelize2);
  BssStuLocChangeNotifications(sequelize2);
  BssRole(sequelize2);
  BssRolePermissions(sequelize2);
  BssRolePermClassDorm(sequelize2);
  
 
  //sync all table
  sequelize2.sync()
}

  try {
    return sequelize2
      .authenticate()
      .then(async () => {
        console.log("Connection has been established successfully.");
        return sequelize2
      })
      .catch((err) => {
        console.log("Unable to connect to the database:", err);
      });
  } catch (err) {
    console.log("an error occured", err);
  }
}
exports.configNewDb = configNewDb;












