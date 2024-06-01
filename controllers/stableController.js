const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const catchAsyncErrors = require("../exception/catchAsyncError");
const cloudinary = require("../utils/cloudinary"); 

const prisma = new PrismaClient();

const createStable = catchAsyncErrors(async (req, res) => {
    try {
        const { name, address, email, phone, password } = req.body;
        const { file } = req;
        const userId = req.user.id;

        // Check if password is provided
        if (!password) {
            return res.status(400).json({ success: false, message: 'Password is required' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        let imageUrl = null;

        // Upload image to cloudinary (if file is present)
        if (file) {
            const cloudinaryResponse = await cloudinary.uploader.upload(file.path);
            imageUrl = cloudinaryResponse.secure_url;
        }

        // Create the stable in the database
        const newStable = await prisma.stable.create({
            data: {
                name,
                address,
                email,
                phone,
                password: hashedPassword,
                image: imageUrl,
                users: {
                    connect: { id: userId }
                }
            }
        });

        res.status(201).json({ success: true, message: 'Stable created successfully', stable: newStable });
    } catch (error) {
        console.error('Error creating stable:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});



// Update a stable
const updateStable = catchAsyncErrors(async (req, res) => {
    try {
        const stableId = req.params.id;
        const { name, address, email, phone } = req.body;
        const userId = req.user.id;

        // Update the stable in the database
        const updatedStable = await prisma.stable.update({
            where: { id: parseInt(stableId) },
            data: {
                name,
                address,
                email,
                phone,
                userId:userId
            }
        });

        res.json({ success: true, message: 'Stable updated successfully', stable: updatedStable });
    } catch (error) {
        console.error('Error updating stable:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get a single stable
const getStable = catchAsyncErrors(async (req, res) => {
    try {
        const stableId = req.params.id;

        // Retrieve the stable from the database
        const stable = await prisma.stable.findUnique({
            where: { id: parseInt(stableId) },
            include: {
                users: {
                    include: {
                        horses: true
                    }
                }
            }
        });

        res.json({ success: true, stable });
    } catch (error) {
        console.error('Error getting stable:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});


// Get all stables
const getAllStables = catchAsyncErrors(async (req, res) => {
    try {
        // Retrieve all stables from the database
        const stables = await prisma.stable.findMany({
            include: {
                users: {
                    include: {
                        horses: true
                    }
                }
            }
        });

        res.json({ success: true, stables });
    } catch (error) {
        console.error('Error getting all stables:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});


// Delete a stable
const deleteStable = catchAsyncErrors(async (req, res) => {
    try {
        const stableId = req.params.id;

        // Delete the stable from the database
        await prisma.stable.delete({
            where: { id: parseInt(stableId) }
        });

        res.json({ success: true, message: 'Stable deleted successfully' });
    } catch (error) {
        console.error('Error deleting stable:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = { createStable, updateStable, getStable, getAllStables, deleteStable };
