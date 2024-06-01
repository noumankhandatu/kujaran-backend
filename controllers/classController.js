const { PrismaClient } = require('@prisma/client');
const { DateTime } = require('luxon');
const prisma = new PrismaClient();
const catchAsyncErrors = require("../exception/catchAsyncError");

// Create a new competition class

const createCompetitionClass = catchAsyncErrors(async (req, res) => {
    const { className, classStatus, type, classStartTime, eventId } = req.body;
    const userId = req.user.id; 

    try {
        const newCompetitionClass = await prisma.competitionClass.create({
            data: {
                className,
                classStatus,
                type,
                classStartTime,
                eventId: eventId ,
                userId: userId
            },
        });

        res.status(201).json({
            success: true,
            message: "Competition class created successfully",
            competitionClass: newCompetitionClass,
        });
    } catch (error) {
        console.log("Error creating competition class:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
});


// Get all competition classes
const getAllCompetitionClasses = catchAsyncErrors(async (req, res) => {
    try {
        const competitionClasses = await prisma.competitionClass.findMany({
            include: {
                user: true ,
                Event: true
            }
        });
        res.status(200).json({ success: true, data: competitionClasses });
    } catch (error) {
        console.error('Error fetching competition classes:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Get competition class by ID
const getCompetitionClassById = catchAsyncErrors(async (req, res) => {
    const { id } = req.params;

    try {
        const competitionClass = await prisma.competitionClass.findUnique({
            where: { id: parseInt(id) },
            include: {
                user: true ,
                Event: true
            }
        });

        if (!competitionClass) {
            return res.status(404).json({ success: false, error: 'Competition class not found' });
        }

        res.status(200).json({ success: true, data: competitionClass });
    } catch (error) {
        console.error('Error fetching competition class by ID:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Update competition class by ID
const updateCompetitionClassById = catchAsyncErrors(async (req, res) => {
    const { id } = req.params;
    const { className, classStatus, classStartTime, type } = req.body;

    try {
        const updatedCompetitionClass = await prisma.competitionClass.update({
            where: { id: parseInt(id) },
            data: {
                className,
                classStatus,
                classStartTime,
                type
            }
        });

        res.status(200).json({ success: true, data: updatedCompetitionClass });
    } catch (error) {
        console.error('Error updating competition class by ID:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Delete competition class by ID
const deleteCompetitionClassById = catchAsyncErrors(async (req, res) => {
    const { id } = req.params;

    try {
        await prisma.competitionClass.delete({
            where: { id: parseInt(id) }
        });

        res.status(200).json({ success: true, message: 'Competition class deleted successfully' });
    } catch (error) {
        console.error('Error deleting competition class by ID:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = {
    createCompetitionClass,
    getAllCompetitionClasses,
    getCompetitionClassById,
    updateCompetitionClassById,
    deleteCompetitionClassById
};
