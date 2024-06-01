const { PrismaClient } = require('@prisma/client');
const catchAsyncErrors = require("../exception/catchAsyncError");

const prisma = new PrismaClient();


const dressageAllJudgesScores = catchAsyncErrors(async (req, res) => {
    try {
        const userId = req.user.id;
        const { registrationId } = req.params;

        if (!registrationId || isNaN(registrationId)) {
            return res.status(400).json({ success: false, message: "Invalid registrationId" });
        }

        const registration = await prisma.registration.findUnique({
            where: { id: parseInt(registrationId) },
            include: {
                DressageScore: {
                    include: {
                        user: true
                    }
                },
            },
        });

        if (!registration) {
            return res.status(404).json({ success: false, message: "Registration not found" });
        }

        const allScores = registration.DressageScore;

        // Prepare data structures to hold scores and differences
        const moveScoresMap = new Map(); 

        // Populate moveScoresMap
        allScores.forEach(score => {
            const move = score.move;
            const totalScore = score.totalScore;

            if (!moveScoresMap.has(move)) {
                moveScoresMap.set(move, []);
            }
            moveScoresMap.get(move).push(totalScore);
        });

        // Calculate difference for each move across all users
        const moveDifferences = [];
        for (const [move, scores] of moveScoresMap) {
            const highestScore = Math.max(...scores);
            const lowestScore = Math.min(...scores);
            const difference = highestScore - lowestScore;

            moveDifferences.push({ move, difference });
        }

        // Calculate total average difference in percentage
        const totalDifferenceSum = moveDifferences.reduce((sum, { difference }) => sum + difference, 0);

 const totalAverageDifference = moveDifferences.length > 0 ? totalDifferenceSum / moveDifferences.length : 0;
 
        const totalAverageDifferencePercentage = totalAverageDifference * 100;

        const averageScoreRecord = await prisma.allscores.create({
            data: {
                totalAverageDifference: totalAverageDifferencePercentage,
                user: { connect: { id: userId } },
                Registration: { connect: { id: parseInt(registrationId) } },
                
            },
        });

        res.status(200).json({
            success: true,
            totalDifferenceSum,
            totalAverageDifference: `${totalAverageDifferencePercentage.toFixed(2)}%`,
            averageScoreRecord,
            moveDifferences
        });

    } catch (error) {
        console.error("Error fetching registration scores:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});




const viewUserScores = catchAsyncErrors(async (req, res) => {
    try {
        const { registrationId, userId } = req.params;
        if (!userId || isNaN(userId) || !registrationId || isNaN(registrationId)) {
            return res.status(400).json({ success: false, message: "Invalid userId or registrationId" });
        }

        const user = await prisma.user.findUnique({
            where: {
                id: parseInt(userId),
            },
            include: {
                JumpingScore: {
                    where: { registrationId: parseInt(registrationId) },
                    include: {
                        user: true // Only include the user who created the JumpingScore
                    }
                },
                DressageScore: {
                    where: { registrationId: parseInt(registrationId) },
                    include: {
                        user: true // Only include the user who created the DressageScore
                    }
                },
                EnduranceScore: {
                    where: { registrationId: parseInt(registrationId) },
                    include: {
                        user: true // Only include the user who created the EnduranceScore
                    }
                },
            },
        });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Combine all scores for the user
        const allScores = [...user.JumpingScore, ...user.DressageScore, ...user.EnduranceScore];

        const userScores = {
            userId: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            scores: allScores.map(score => ({
                type: score.hasOwnProperty('move') ? 'Dressage' : (score.hasOwnProperty('arrival') ? 'Endurance' : 'Jumping'),
                faults: score.faults,
                time: score.time,
                totalScore: score.totalScore,
                move: score.move || null,
                multiplier: score.multiplier || null,
                comment: score.comment || null,
                arrival: score.arrival || null,
                departure: score.departure || null,
                recovery: score.recovery || null,
                value: score.value || null,
            })),
        };

        res.status(200).json({ success: true, userScores });
    } catch (error) {
        console.error("Error fetching user scores:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});



const getremainingAllScores = catchAsyncErrors(async (req, res) => {
    try {
        const { registrationId } = req.params;
        if (!registrationId || isNaN(registrationId)) {
            return res.status(400).json({ success: false, message: "Invalid registrationId" });
        }

        const registration = await prisma.registration.findUnique({
            where: {
                id: parseInt(registrationId),
            },
            include: {
                JumpingScore: {
                    include:{
                        user: true
                    }
                },
                EnduranceScore:{
                    include:{
                        user:true
                    }
                }
            },
        });

        if (!registration) {
            return res.status(404).json({ success: false, message: "Registration not found" });
        }

        // Group scores by user with same scores
        const groupedScores = {};
        const allScores = [...registration.EnduranceScore ,...registration.JumpingScore];
        allScores.forEach(score => {
            const key = score.user.id
            if (!groupedScores[key]) {
                groupedScores[key] = {
                    user: {
                        id: score.user.id,
                        name: score.user.name,
                        email: score.user.email,
                        role: score.user.role,
                    },
                    scores: [],
                };
            }
            groupedScores[key].scores.push(score);
        });

        const scoresArray = Object.values(groupedScores);

        const registrationScores = {
            registrationId: registration.id,
            scores: scoresArray.map((scoreGroup, index) => ({ // Added index parameter
                serialNumber: index + 1, // Serial number based on index + 1
                user: scoreGroup.user,
                scores: scoreGroup.scores.map(score => ({
                    id : score.id,
                    move: score.move,
                    multiplier: score.multiplier,
                    scores: score.scores,
                    totalScore: score.totalScore,
                    comment: score.comment,
                    value: score.value,
                    totalScore: score.totalScore,
                })),
            })),
        };

        res.status(200).json({ success: true, registrationScores });
    } catch (error) {
        console.error("Error fetching registration scores:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});




module.exports = { dressageAllJudgesScores, viewUserScores ,getremainingAllScores};
