const PDFDocument = require('pdfkit');
const fs = require('fs');

// Create a new PDF document
const doc = new PDFDocument();

// Pipe the PDF to a writable stream (e.g., a file)
const stream = fs.createWriteStream('data-with-header-font.pdf');
doc.pipe(stream);

// Define your data array containing objects
const data = [
  { name: 'Alice', age: 28, location: 'New York' },
  { name: 'Bob', age: 32, location: 'San Francisco' },
  { name: 'Charlie', age: 25, location: 'Los Angeles' },
];

// Set font size and style for the header row
const headerFontSize = 16; // Change the header font size here
const headerFontType = 'Bold'; // Change the header font type here

// Function to add a row of data and a horizontal line to the PDF
function addDataRowWithLine(row, isHeader = false) {
  if (isHeader) {
    doc.font(`Helvetica-${headerFontType}`).fontSize(headerFontSize); // Set header font
  } else {
    doc.font('Helvetica').fontSize(12); // Set regular font for data rows
  }

  for (const key of Object.keys(row)) {
    doc.fillColor('black').text(`${key}: ${row[key]}`, { align: 'left' });
  }
  doc.moveDown(); // Move down to the next row
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke(); // Add a horizontal line
  doc.moveDown(); // Move down after the line
}

// Add a header row with a different font and style
const headers = { name: 'Name', age: 'Age', location: 'Location' };
addDataRowWithLine(headers, true); // Pass true to indicate it's a header row

// Iterate through data objects and add them to the PDF with lines
for (const item of data) {
  addDataRowWithLine(item);
}

// Finalize the PDF and close the stream
doc.end();

stream.on('finish', () => {
  console.log('PDF with custom header font and style created successfully');
});




module.exports.CreateSchool = async (req, res) => {
    try {
        const school_detail = req.body;
        const file_data = req.files;

        console.log(":::::::::::", school_detail);
        console.log(file_data);

        // Handle special characters in school name
        const school_name = school_detail.school_name;
        const school_code = school_name.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '-');

        school_detail.school_name = school_name;
        school_detail.school_code = school_code;

        // Rest of your code remains the same

        const SchoolResponse = await SchoolDetails.findOne({
            where: { school_code: school_code },
        });

        // Rest of your code remains the same

        // Handle special characters in email
        const user_email = school_detail.email;
        const user_name = `${school_detail.first_name} ${school_detail.last_name}`;

        // Rest of your code remains the same

        const mail_options = {
            html: email_template,
            to: user_email,
            from: process.env.MAIL_FROM_ADDRESS,
            subject: "BSS - School User Registration",
        };

        SendEmail(mail_options)
            .then((info) => {
                console.log("School User login SendEmail info------------", info);
            })
            .catch((error) => {
                console.log("School User login SendEmail error------------", error);
            });

        await transactionInstance.commit();

        return res.json({
            status: 200,
            success: true,
            message: "School created successfully!",
        });
    } catch (error) {
        console.error("Error: ", error);
        return res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists.",
        });
    }
};
