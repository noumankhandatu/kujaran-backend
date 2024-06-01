const { PrismaClient } = require('@prisma/client');
const catchAsyncErrors = require("../exception/catchAsyncError");


const prisma = new PrismaClient();

const createArticles = catchAsyncErrors(async (req, res) => {
    try {
        const { name, type, } = req.body;
        const userId = req.user.id;

        if (!name || !type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (!user) {
            return res.status(404).json({ error: "User not found" })
        }

        const article = await prisma.article.create({
            data: {
                name,
                type,
                userId
            }
        })

        res.status(200).json({ message: "article are created ", article })
    } catch (error) {
        console.log("Error Creating article:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});


const articleDressageCreated = catchAsyncErrors(async (req, res) => {
    const userId = req.user.id;

    try {
        const { moves, multiplier, articleId } = req.body;
        if (!moves || !multiplier || !articleId) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        let numericMultiplier = 1; // Default value
        if (multiplier) {
            numericMultiplier = parseFloat(multiplier.replace(/[^\d.-]/g, ''));
        }

        const article = await prisma.article.findUnique({ where: { id: articleId } });
        if (!article || article.type !== "DRESSAGE") {
            return res.status(404).json({ error: "Article not found or not the Dressage Article" });
        }

        const dressageArticle = await prisma.dressageArticle.create({
            data: {
                moves: `move#${moves}`,
                multiplier: numericMultiplier,
                articleId,
                userId,
            },
        });

        // Fetch user articles without conflicting scalar fields
        const userArticles = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                DressageArticle: true,
                JumpingArticle: true,
                EnduranceArticle: true,
            },
        });

        res.status(201).json({ dressageArticle, userArticles });
    } catch (error) {
        console.error("Error creating the Dressage Article ", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});



const articleJumpingCreated = catchAsyncErrors(async (req, res) => {
    const userId = req.user.id;

    try {
        const { input, sortPriority, articleId } = req.body;

        if (!input || !sortPriority || !articleId) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const article = await prisma.article.findUnique({ where: { id: articleId } });
        if (!article || article.type !== "SHOW_JUMPING") {
            return res.status(404).json({ error: "Article not found or not the Jumping Article" });
        }

        const jumpingArticle = await prisma.jumpingArticle.create({
            data: {
                input,
                sortPriority,
                articleId,
                userId,
            },
        });

        // Fetch user articles without conflicting scalar fields
        const userArticles = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                DressageArticle: true,
                JumpingArticle: true,
                EnduranceArticle: true,
            },
        });

        res.status(201).json({ jumpingArticle, userArticles });
    } catch (error) {
        console.error('Error in creating the jumping article: ', error);
        res.status(500).json({ success: false, message: "Internal server Error" });
    }
});


const articleEnduranceCreated = catchAsyncErrors(async (req, res) => {
    const userId = req.user.id;

    try {
        const { Gate, articleId } = req.body;

        if (!Gate || !articleId) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const article = await prisma.article.findUnique({ where: { id: articleId } })
        if (!article || article.type !== "ENDURANCE") {
            return res.status(404).json({ error: "Article not found or not the Endurance Article" })

        }

        const enduranceArticle = await prisma.enduranceArticle.create({
            data: {
                Gate: `Gate#${Gate}`,
                articleId,
                userId,
            },
        });

        // Fetch user articles without conflicting scalar fields
        const userArticles = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                DressageArticle: true,
                JumpingArticle: true,
                EnduranceArticle: true,
            },
        });

        // Send response with both the created endurance article and user articles
        res.status(201).json({ enduranceArticle, userArticles });
    } catch (error) {
        console.error('Error in creating the endurance article: ', error);
        res.status(500).json({ success: false, message: "Internal server Error" });
    }
});



const editArticle = catchAsyncErrors(async (req, res) => {
    try {
        const { articleId } = req.params;
        const { name, type } = req.body;

        const userId = req.user.id;

        if (!name || !type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const existingArticle = await prisma.article.findUnique({ where: { id: parseInt(articleId) } });

        if (!existingArticle || existingArticle.userId !== userId) {
            return res.status(404).json({ error: "Article not found or no permission to edit the article" });
        }

        const updatedArticle = await prisma.article.update({
            where: { id: parseInt(articleId) },
            data: {
                name,
                type,
            },
        });

        res.status(200).json({
            success: true,
            message: "Article updated successfully",
            article: updatedArticle,
        });
    } catch (error) {
        console.log("Error editing article:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});



const getAllArticles = catchAsyncErrors(async (req, res) => {
    try {
        const articles = await prisma.article.findMany({
            include: {
                user: true, // Include user details for each article
                DressageArticles: true,
                JumpingArticle: true,
                EnduranceArticle: true,
            },
        });

        res.status(200).json({
            success: true,
            articles
        });
    } catch (error) {
        console.log("Error fetching articles:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});


const getArticleById = catchAsyncErrors(async (req, res) => {
    try {
        const { articleId } = req.params;
        const parsedArticleId = parseInt(articleId);

        const article = await prisma.article.findUnique({
            where: {
                id: parsedArticleId,
            },
            include: {
                DressageArticles: true,
                JumpingArticle: true,
                EnduranceArticle: true,
            },
        });

        if (!article) {
            return res.status(404).json({ success: false, message: "Article not found" });
        }

        res.status(200).json({
            success: true,
            article
        });
    } catch (error) {
        console.log("Error fetching article:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});




const deleteArticle = catchAsyncErrors(async (req, res) => {
    try {
        const { articleId } = req.params;

        await prisma.article.delete({
            where: { id: parseInt(articleId) }
        });

        res.status(200).json({
            success: true,
            message: "Article deleted successfully"
        });
    } catch (error) {
        console.log("Error deleting article:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

module.exports = { createArticles, articleDressageCreated, articleEnduranceCreated, articleJumpingCreated, editArticle, deleteArticle, getArticleById, getAllArticles }