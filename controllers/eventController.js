const { PrismaClient } = require('@prisma/client');
const catchAsyncErrors = require("../exception/catchAsyncError");
const cloudinary = require("../utils/cloudinary");

const prisma = new PrismaClient();

const createEvents = catchAsyncErrors(async (req, res) => {
    try {
        const { title, description, location, status, startDate, endDate } = req.body;
        const { file } = req;
        const userId = req.user.id;

        let imageUrl = null;

        if (file) {
            const cloudinaryResponse = await cloudinary.uploader.upload(file.path);
            imageUrl = cloudinaryResponse.secure_url;
        }

        // No need to convert startDate and endDate to ISO format as they are already in the correct format
        const newEvent = await prisma.event.create({
            data: {
                title,
                description,
                location,
                startDate,
                status,
                endDate,
                image: imageUrl,
                users: {
                    connect: { id: userId } 
                }
            }
        });

        res.status(201).json({
            success: true,
            message: "Event created successfully",
            event: newEvent
        });
    } catch (error) {
        console.log("Error creating event:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});



const getAllEvents = catchAsyncErrors(async (req, res) => {
    try {
        const events = await prisma.event.findMany({
            include: {
                users: true // Include the related user details
            }
        });
        res.status(200).json({ success: true, events });
    } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

const getEventById = catchAsyncErrors(async (req, res) => {
    try {
        const { id } = req.params;
        const event = await prisma.event.findUnique({
            where: { id: parseInt(id) },
            include: {
                users: true,
                CompetitionClass: true
            }
        });
        if (!event) {
            return res.status(404).json({ success: false, message: "Event not found" });
        }
        res.status(200).json({ success: true, event });
    } catch (error) {
        console.error("Error fetching event:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});


// Update event by ID
const updateEventById = catchAsyncErrors(async (req, res) => {
    try {
        const { id } = req.params;
        const { title, location, description, startDate, endDate, status } = req.body;
        const { file } = req;

        const userId = req.user.id;

        let imageUrl = null;

        // Upload file to Cloudinary if provided
        if (file) {
            const cloudinaryResponse = await cloudinary.uploader.upload(file.path);
            imageUrl = cloudinaryResponse.secure_url;
        }

        // Update event in the database
        const updatedEvent = await prisma.event.update({
            where: { id: parseInt(id) },
            data: {
                title,
                location,
                description,
                startDate,
                endDate,
                status,
                image: imageUrl,
                userId: parseInt(userId),
            },
        });

        // Respond with success message and updated event data
        res.status(200).json({
            success: true,
            message: "Event updated successfully",
            event: updatedEvent,
        });
    } catch (error) {
        // Handle errors
        console.error("Error updating event:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});



const deleteEventById = catchAsyncErrors(async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.event.delete({ where: { id: parseInt(id) } });
        res.status(200).json({ success: true, message: "Event deleted successfully" });
    } catch (error) {
        console.error("Error deleting event:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

module.exports = { createEvents, getAllEvents, getEventById, updateEventById, deleteEventById};
