const { PrismaClient } = require('@prisma/client');
const catchAsyncErrors = require("../exception/catchAsyncError");
const cloudinary = require("../utils/cloudinary");
const { parse } = require('dotenv');

const prisma = new PrismaClient();


const CreatedressageScores = catchAsyncErrors(async (req, res) => {
    console.log('User:', req.user);

    try {
        const { registrationId, multiplier, comment, scores } = req.body;
        const userId = req.user.id;

        // Fetch the registration to ensure it exists
        const registration = await prisma.registration.findUnique({
            where: { id: parseInt(registrationId) },
            include: { class: true } // Include the class details
        });

        // Check if the registration exists
        if (!registration) {
            return res.status(404).json({ success: false, message: "Registration not found" });
        }

        // Check if the registration class is of type "DRESSAGE"
        if (registration.class.type !== "DRESSAGE") {
            return res.status(400).json({ success: false, message: "Registration class is not for dressage scores" });
        }

        const userScores = await prisma.dressageScore.findMany({
            where: {
                userId: userId
            }
        });
        
        console.log(userScores);

        const userScoresCount = await prisma.dressageScore.count({
            where: { 
                userId: userId,
                registrationId: registrationId
             },
        });

        // Increment the move number for the new score
        const moveNumber = userScoresCount + 1;
        const move = `move#${moveNumber}`;

        let numericMultiplier = 1; // Default value
        if (multiplier) {
            numericMultiplier = parseFloat(multiplier.replace(/[^\d.-]/g, ''));
        }

        const numericScores = parseFloat(scores); // Parse scores to numeric value
        const totalScore = numericScores * numericMultiplier;

        let value;

        if (numericScores === -2) value = 'E-D';
        else if (numericScores === -3) value = 'RF-D';
        else if (numericScores === -4) value = 'WD-D';
        else if (numericScores === -5) value = 'R-D';
        else if (numericScores === -6) value = 'DQ-D';
        else if (numericScores === -1) value = '--D';
        else value = '';

        // Create Dressage Score for the registration
        const dressageScore = await prisma.dressageScore.create({
            data: {
                move,
                multiplier: numericMultiplier,
                scores: numericScores,
                totalScore,
                comment,
                value,
                user: { connect: { id: userId } },
                Registration: { connect: { id: registrationId } },
            },
        });

        // Fetch all dressage scores for the user after creating the dressage score
        const allScores = await prisma.dressageScore.findMany({
            where: { userId: userId },
        });

        res.status(201).json({ success: true, data: { dressageScore, allScores } });
    } catch (error) {
        console.error("Error posting scores:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});


const editDressageScores = catchAsyncErrors(async (req, res) => {
    console.log('User:', req.user);

    try {
        const { dressageScoreId, multiplier, comment, scores } = req.body;
        const userId = req.user.id;

        // Fetch the dressage score to ensure it exists and belongs to the user
        const existingScore = await prisma.dressageScore.findUnique({
            where: { id: parseInt(dressageScoreId) },
            include: { Registration: true } // Include the associated registration
        });

        // Check if the score exists
        if (!existingScore) {
            return res.status(404).json({ success: false, message: "Dressage score not found" });
        }


        let numericMultiplier = 1; // Default value
        if (multiplier) {
            numericMultiplier = parseFloat(multiplier.replace(/[^\d.-]/g, ''));
        }

        const numericScores = parseFloat(scores); // Parse scores to numeric value
        const totalScore = numericScores * numericMultiplier;

        let value;

        if (numericScores === -2) value = 'E-D';
        else if (numericScores === -3) value = 'RF-D';
        else if (numericScores === -4) value = 'WD-D';
        else if (numericScores === -5) value = 'R-D';
        else if (numericScores === -6) value = 'DQ-D';
        else if (numericScores === -1) value = '--D';
        else value = '';

        // Update Dressage Score
        const updatedScore = await prisma.dressageScore.update({
            where: { id: parseInt(dressageScoreId) },
            data: {
                multiplier: numericMultiplier,
                scores: numericScores,
                totalScore,
                comment,
                value,
            },
        });

        // Fetch all dressage scores for the user after updating the score
        const allScores = await prisma.dressageScore.findMany({
            where: { userId: userId },
        });

        res.status(200).json({ success: true, data: { updatedScore, allScores } });
    } catch (error) {
        console.error("Error editing scores:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});


const deleteDressageScores = catchAsyncErrors(async (req, res) => {
    const { id } = req.params; // Assuming id is passed as a route parameter

    try {
        const dressageScore = await prisma.dressageScore.findUnique({
            where: { id: parseInt(id) }
        });

        if (!dressageScore) {
            return res.status(404).json({ message: "Dressage score not found" });
        }

        await prisma.dressageScore.delete({
            where: { id: parseInt(id) }
        });

        res.status(200).json({ message: "Dressage score deleted successfully" });
    } catch (error) {
        console.error("Error deleting dressage score:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


const getAllDressageScores = catchAsyncErrors(async (req, res) => {
    try {
        // Ensure req.user is defined and contains the user ID
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        // Fetch all Dressage Scores for the given userId
        const dressageScores = await prisma.dressageScore.findMany({

            include: {
                Registration: {
                    include: {
                        user: true,
                        horse: true,
                        event: true,
                        class: true,

                    }
                },
                user: true,
            },
        });

        res.status(200).json({ success: true, data: dressageScores });
    } catch (error) {
        console.error("Error fetching Dressage Scores:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});


const getScoresAuthenticateUser = catchAsyncErrors(async (req, res) => {
    try {
        // Ensure req.user is defined and contains the user ID
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const userId = req.user.id;

        // Fetch all Dressage Scores for the given userId
        const dressageScores = await prisma.dressageScore.findMany({
            where: {
                userId: userId,
            },
            include: {
                user: true,
            },
        });

        res.status(200).json({ success: true, data: dressageScores });
    } catch (error) {
        console.error("Error fetching Dressage Scores:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
})



const getUserScoresFromAllJudges = catchAsyncErrors(async (req, res) => {
    try {
        const judges = await prisma.user.findMany({
            where: {
                role: 'JUDGE',
            },
        });

        // Extract judge IDs from the judges array
        const judgeIds = judges.map(judge => judge.id);

        // Fetch all scores posted by judges for any class type
        const allScores = await prisma.allscores.findMany({
            where: {
                userId: {
                    in: judgeIds,
                },
            },
            include: {
                user: true, // Include user information for each score
                JumpingScore: true, // Include related JumpingScores
                DressageScore: true, // Include related DressageScores
                EnduranceScore: true, // Include related EnduranceScores
            },
        });

        res.status(200).json({ success: true, data: allScores });
    } catch (error) {
        console.error("Error fetching scores from judges:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});




const createEnduranceScores = catchAsyncErrors(async (req, res) => {
    try {
        const { registrationId } = req.body;
        const userId = req.user.id; // Extract userId from req.user

        // Fetch the registration to ensure it exists
        const registration = await prisma.registration.findUnique({
            where: { id: parseInt(registrationId) },
            include: { class: true } // Include the class details
        });

        // Check if the registration exists
        if (!registration) {
            return res.status(404).json({ success: false, message: "Registration not found" });
        }

        // Check if the registration class is of type "JumpingScores"
        if (registration.class.type !== "ENDURANCE") {
            return res.status(400).json({ success: false, message: "Registration class is not for jumping scores" });
        }
        // Get current date and time
        const currentDate = new Date(); // This will be the current date and time

        const enduranceScore = await prisma.enduranceScore.create({
            data: {
                arrival: currentDate,
                departure: currentDate,
                recovery: currentDate,
                user: { connect: { id: userId } },
                Registration: { connect: { id: registrationId } },
            },
        });

        res.status(201).json({ enduranceScore });
    } catch (error) {
        console.error('Error Creating the Endurance Score:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



const updateEnduranceScores = catchAsyncErrors(async (req, res) => {
    const { scoreId } = req.params;
    const { arrival, departure, recovery } = req.body;

    try {
        const existingScores = await prisma.enduranceScore.findUnique({
            where: { id: parseInt(scoreId) },
        });

        if (!existingScores) {
            return res.status(404).json({ message: 'Endurance Score not found' });
        }

        // Parse time function
        const parseTime = (timeStr) => {
            const [hours, minutes, seconds] = timeStr.split(':').map(Number);
            const currentDate = new Date(); // Get the current date
            return new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), hours, minutes, seconds);
        };

        // Update logic
        const updateArrival = arrival ? parseTime(arrival) : existingScores.arrival;
        const updateDeparture = departure ? parseTime(departure) : existingScores.departure;
        const updateRecovery = recovery ? parseTime(recovery) : existingScores.recovery;

        const updatedEnduranceScores = await prisma.enduranceScore.update({
            where: { id: parseInt(scoreId) },
            data: {
                arrival: updateArrival,
                departure: updateDeparture,
                recovery: updateRecovery,
            },
        });

        res.status(200).json({ enduranceScore: updatedEnduranceScores });
    } catch (error) {
        console.error('Error in Updating the Endurance Scores:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



const getAllEnduranceScores = catchAsyncErrors(async (req, res) => {
    try {
        // Ensure req.user is defined and contains the user ID
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const allEnduranceScores = await prisma.enduranceScore.findMany({
            include: {
                Registration: {
                    include: {
                        user: true,
                        horse: true,
                        event: true,
                        class: true
                    }
                },
                user: true,
            },
        });

        res.status(200).json({ allEnduranceScores });
    } catch (error) {
        console.error('Error fetching all endurance scores:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


const deleteEnduranceScores = catchAsyncErrors(async (req, res) => {
    const { id } = req.params; // Assuming id is passed as a route parameter

    try {
        const enduranceScore = await prisma.enduranceScore.findUnique({
            where: { id: parseInt(id) }
        });

        if (!enduranceScore) {
            return res.status(404).json({ message: "Endurance score not found" });
        }

        await prisma.enduranceScore.delete({
            where: { id: parseInt(id) }
        });

        res.status(200).json({ message: "Endurance score deleted successfully" });
    } catch (error) {
        console.error("Error deleting Endurance score:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});





module.exports = { CreatedressageScores, editDressageScores, deleteDressageScores, getAllDressageScores, getUserScoresFromAllJudges, createEnduranceScores, getAllEnduranceScores, deleteEnduranceScores, updateEnduranceScores, getScoresAuthenticateUser }