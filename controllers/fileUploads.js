const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const catchAsyncErrors = require("../exception/catchAsyncError");
const exceljs = require('exceljs');

const uploadPdfForm = catchAsyncErrors(async (req, res) => {
    if (!req.file) {
        return res.render('uploadPdfForm', { error_message: "No file uploaded" })
    }
    // Save file information in the database
    try {
        const eventId = parseInt(req.body.eventId); // Parse eventId to integer
        const createdPdfForm = await prisma.pdfForm.create({
            data: {
                filename: req.file.filename,
                filePath: req.file.path,
                eventId: eventId // Use the parsed eventId
            }
        });

        // File upload and database entry successful
        return res.status(200).json({ success: true, message: 'File uploaded and saved successfully', pdfForm: createdPdfForm });
    } catch (error) {
        console.error('Error saving file information to database:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});


const importFromExcel = catchAsyncErrors(async (req, res) => {
    try {
        const { classId } = req.params; // Assuming classId is passed as a parameter

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet("Registered Users");
    
        // Define columns in the worksheet
        worksheet.columns = [
            { header: 'User Name', key: 'userName', width: 20 },
            { header: 'Horse Name', key: 'horseName', width: 20 },
            { header: 'Horse ID', key: 'horseId', width: 10 },
            { header: 'Start Date', key: 'startDate', width: 15 }
        ];

        const competitionClass = await prisma.competitionClass.findUnique({
            where: { id: parseInt(classId) },
            include: {
                registrations: {
                    include: {
                        user: true,
                        horse: true
                    }
                },
                Event: true
            }
        });

        // Extract registrations from competition class
        const registrations = competitionClass.registrations;
    
        // Populate rows in the worksheet with registration details
        registrations.forEach((registration) => {
            worksheet.addRow({
                userName: registration.user.name,
                horseName: registration.horse.name,
                horseId: registration.horse.id,
                startDate: registration.startDate.toLocaleString() // Assuming startDate is a DateTime field
            });
        });
    
        // Style the header row
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true };
        });
    
        // Set headers for the response
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheatml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=registered_users.xlsx`
        );
    
        // Write workbook to response and send
        return workbook.xlsx.write(res).then(() => {
            res.end();
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});


 

module.exports = {uploadPdfForm ,importFromExcel}
