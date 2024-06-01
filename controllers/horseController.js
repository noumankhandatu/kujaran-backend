const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const catchAsyncErrors = require("../exception/catchAsyncError");
const cloudinary = require("../utils/cloudinary"); 

const prisma = new PrismaClient();

const signUpHorse = catchAsyncErrors(async (req, res) => {
    try {
        const { name, email, password, phone, gender, color, dob } = req.body;
        const { file } = req;
        const userId = req.user.id;

        // Check if password is provided
        if (!password) {
            return res.status(400).json({ success: false, message: 'Password is required' });
        }

        // Check for existing horse with the same email
        const existingHorse = await prisma.horse.findUnique({
            where: { email },
        });

        if (existingHorse) {
            return res.status(400).json({ success: false, message: 'Horse with this email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        let imageUrl = null;

        // Upload image to cloudinary (if file is present)
        if (file) {
            const cloudinaryResponse = await cloudinary.uploader.upload(file.path);
            imageUrl = cloudinaryResponse.secure_url;
        }

        const dobISO = new Date(dob).toISOString();

        // Create a new horse in the database
        const newHorse = await prisma.horse.create({
            data: {
                name,
                email,
                password: hashedPassword,
                phone,
                gender,
                dob: dobISO,
                color,
                image: imageUrl,
                userId: userId, // Associate the horse with the authenticated user
            },
        });

        res.json({ success: true, message: 'Horse registered successfully', horse: newHorse });
    } catch (error) {
        console.error('Error in horse registration:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});




  const updateHorseProfile = catchAsyncErrors(async (req, res) => {
    try {
        const horseId = req.params.id;
        const { name, email, phone, gender, color } = req.body;
        const { file } = req;
        const userId = req.user.id;

        // Check if the provided email already exists in the database
        const existingHorseWithEmail = await prisma.horse.findFirst({
            where: {
                email: {
                    equals: email,
                    not: {
                        equals: email // Exclude the current email being updated
                    }
                }
            }
        });

        if (existingHorseWithEmail) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }

        let updatedData = {
            name,
            email,
            phone,
            gender,
            color,
            userId:userId
        };

        // Upload new image to cloudinary (if file is present)
        if (file) {
            const cloudinaryResponse = await cloudinary.uploader.upload(file.path);
            updatedData.image = cloudinaryResponse.secure_url;
        }

        const updatedHorse = await prisma.horse.update({
            where: { id: parseInt(horseId) },
            data: updatedData
        });

        res.json({ success: true, message: 'Horse profile updated successfully', horse: updatedHorse });
    } catch (error) {
        console.error('Error updating horse profile:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});


const getHorseProfile = catchAsyncErrors(async (req, res) => {
    try {
        const horseId = parseInt(req.params.id);

        // Fetch the horse profile along with the related user data
        const horse = await prisma.horse.findUnique({
            where: { id: horseId },
            include: {
                user: true ,// Include the related user details
                registrations: {
                    include: {
                        event: true, 
                        class: true   
                    }
                }
            }
        });

        if (!horse) {
            return res.status(404).json({ success: false, message: 'Horse not found' });
        }

        res.json({ success: true, horse });
    } catch (error) {
        console.error('Error getting horse profile:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});


const getAllHorses = catchAsyncErrors(async (req, res) => {
    try {
        // Fetch all horses along with their related user details
        const horses = await prisma.horse.findMany({
            include: {
                user: true, // Include the related user details
                registrations: {
                    include: {
                        event: true, 
                        class: true   
                    }
                }
            }
        });

        res.json({ success: true, horses });
    } catch (error) {
        console.error('Error getting all horse data:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});


const deleteHorse = catchAsyncErrors(async (req, res) => {
    try {
        const horseId = req.params.id;

        await prisma.horse.delete({
            where: { id: parseInt(horseId) }
        });

        res.json({ success: true, message: 'Horse deleted successfully' });
    } catch (error) {
        console.error('Error deleting horse:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = {signUpHorse , updateHorseProfile,deleteHorse, getAllHorses ,getHorseProfile};
