const { PrismaClient } = require('@prisma/client');
const { DateTime } = require('luxon');
const catchAsyncErrors = require("../exception/catchAsyncError");

const prisma = new PrismaClient();

const getUpcomingEvents = catchAsyncErrors(async (req, res) => {
    try {
        const upcomingEvents = await prisma.event.findMany({
            where: { status: 'UPCOMING' }
        });

        for (const event of upcomingEvents) {
            // Fetch all classes related to the event
            event.classes = await prisma.competitionClass.findMany({
                where: { eventId: event.id }
            });
        }

        res.status(200).json({
            success: true,
            data: upcomingEvents
        });
    } catch (error) {
        console.log("Error Fetching upcoming Events:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
});


const getLiveEvents = catchAsyncErrors(async (req, res) => {
    try {
        const upcomingEvents = await prisma.event.findMany({
            where: { status: 'LIVE' }
        });

        for (const event of upcomingEvents) {
            // Fetch all classes related to the event
            event.classes = await prisma.competitionClass.findMany({
                where: { eventId: event.id }
            });
        }

        res.status(200).json({
            success: true,
            data: upcomingEvents
        });
    } catch (error) {
        console.log("Error Fetching upcoming Events:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
});


const getEndedEvents = catchAsyncErrors(async (req, res) => {
    try {
        const upcomingEvents = await prisma.event.findMany({
            where: { status: 'ENDED' }
        });

        for (const event of upcomingEvents) {
            // Fetch all classes related to the event
            event.classes = await prisma.competitionClass.findMany({
                where: { eventId: event.id }
            });
        }

        res.status(200).json({
            success: true,
            data: upcomingEvents
        });
    } catch (error) {
        console.log("Error Fetching upcoming Events:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
});



const createRegistration = catchAsyncErrors(async (req, res) => {
    const userId = req.user.id;
    const { horseId, classId, eventId, stabling, paymentStatus, startDate, endDate } = req.body;
    try {
        console.log('Request Body:', req.body); 
        const parsedClassId = parseInt(classId);

        // Check if user already registered for this class and event
        const existingRegistration = await prisma.registration.findFirst({
            where: {
                userId,
                eventId,
                classId: parsedClassId
            }
        });

        if (existingRegistration) {
            return res.status(400).json({
                success: false,
                error: "User has already registered for this class and event combination"
            });
        }

        const existingHorse = await prisma.horse.findUnique({
            where: { id: horseId }
        });
        const existingClass = await prisma.competitionClass.findUnique({
            where: { id: parsedClassId }
        });
        const existingEvent = await prisma.event.findUnique({
            where: { id: eventId }
        });

        if (!existingHorse || !existingClass || !existingEvent) {
            return res.status(404).json({
                success: false,
                error: "Invalid horse, class, or event provided"
            });
        }

        const registration = await prisma.registration.create({
            data: {
                horse: { connect: { id: horseId } },
                class: { connect: { id: parsedClassId } },
                event: { connect: { id: eventId } },
                user: { connect: { id: userId } },
                stabling,
                paymentStatus,
                startDate,
                endDate
            }
        });
        res.status(201).json({
            success: true,
            data: registration
        });
    } catch (error) {
        console.error('Error creating registration:', error);
        res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
});



const updateRegistration = catchAsyncErrors(async (req, res) => {
    const { id } = req.params;
    const { horseId, classId, eventId, stabling, paymentStatus, startDate, endDate } = req.body;
    try {
        // Check if the registration exists
        const existingRegistration = await prisma.registration.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingRegistration) {
            return res.status(404).json({ success: false, error: 'Registration not found' });
        }

        // Update the registration
        const updatedRegistration = await prisma.registration.update({
            where: { id: parseInt(id) },
            data: {
                horseId,
                classId,
                eventId,
                stabling,
                paymentStatus,
                startDate,
                endDate
            }
        });

        res.status(200).json({ success: true, data: updatedRegistration });
    } catch (error) {
        console.error('Error updating registration:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});


const cancelRegistration = catchAsyncErrors(async (req, res) => {
    const { id } = req.params;
    try {
        // Check if the registration exists
        const existingRegistration = await prisma.registration.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingRegistration) {
            return res.status(404).json({ success: false, error: 'Registration not found' });
        }

        // Delete the registration
        await prisma.registration.delete({
            where: { id: parseInt(id) }
        });

        res.status(200).json({ success: true, message: 'Registration canceled successfully' });
    } catch (error) {
        console.error('Error canceling registration:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
})

const getAllRegistration = catchAsyncErrors(async(req,res)=>{
    try {
        const getAllregistrations = await prisma.registration.findMany()
        res.status(200).json({
            success:true,
            data:getAllregistrations
        })
        
    } catch (error) {
        console.error("Error fetching registration" , error)
        res.status(500).json({
            success:false,
            error:"Internal server error"
        })
        
    }
})

const getRegistrationById = catchAsyncErrors(async (req, res) => {
    const { id } = req.params;
    try {
        const registration = await prisma.registration.findUnique({
            where: { id: parseInt(id) },
            include:{
                user: true,
                JumpingScore: {
                    include: {
                        user: true
                    }
                },
                DressageScore: {
                    include:{
                        user: true
                    }
                },
                EnduranceScore: {
                    include:{
                        user: true
                    }
                },
            }
        });

        if (!registration) {
            return res.status(404).json({ success: false, error: 'Registration not found' });
        }

        // Get all scores without removing duplicates
        const jumpingScores = registration.JumpingScore;
        const dressageScores = registration.DressageScore;
        const enduranceScores = registration.EnduranceScore;

        const dataWithScores = {
            user: registration.user,
            JumpingScore: jumpingScores,
            DressageScore: dressageScores,
            EnduranceScore: enduranceScores,
        };

        res.status(200).json({ success: true, data: dataWithScores });
    } catch (error) {
        console.error('Error fetching registration by ID:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});




const getUserRegistrations = catchAsyncErrors(async (req, res) => {
    try {
      
        const userId = req.userId; 

        const userRegistrations = await prisma.registration.findMany({
            where: { userId: userId },
            include: {
                event: true,
                class: true
            }
        });

        // Loop through user registrations to format data
        const formattedRegistrations = userRegistrations.map(registration => {
            return {
                registrationId: registration.id,
                event: {
                    eventId: registration.event.id,
                    eventName: registration.event.title,
                    eventLocation: registration.event.location,
                    startDate: registration.event.startDate,
                    endDate: registration.event.endDate
                },
                class: {
                    classId: registration.class.id,
                    className: registration.class.className,
                    classStartTime: registration.class.classStartTime
                }
            };
        });

        res.status(200).json({
            success: true,
            data: formattedRegistrations
        });
    } catch (error) {
        console.log("Error Fetching user registrations:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
});



module.exports = { getUpcomingEvents, createRegistration ,updateRegistration ,cancelRegistration ,getAllRegistration ,getRegistrationById,getUserRegistrations , getLiveEvents ,getEndedEvents};
