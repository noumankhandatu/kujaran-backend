const { PrismaClient } = require("@prisma/client");
const catchAsyncErrors = require("../exception/catchAsyncError");
const cloudinary = require("../utils/cloudinary");

const prisma = new PrismaClient();

const createEventSponsor = catchAsyncErrors(async (req, res) => {
  try {
    const { name, eventId } = req.body;
    const { file } = req;
    let imageUrl = null;

    if (file) {
      const cloudinaryResponse = await cloudinary.uploader.upload(file.path);
      imageUrl = cloudinaryResponse.secure_url;
    }

    const eventID = parseInt(eventId);

    // Create the event sponsor
    const newEventSponsor = await prisma.eventSponsor.create({
      data: {
        name,
        image: imageUrl,
        event: { connect: { id: eventID } },
      },
    });

    res.status(201).json({
      success: true,
      message: "Event sponsor created successfully",
      eventSponsor: newEventSponsor,
    });
  } catch (error) {
    console.log("Error creating event sponsor:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

const deleteEventSponsorById = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.eventSponsor.delete({ where: { id: parseInt(id) } });
    res.status(200).json({ success: true, message: "Event sponsor deleted successfully" });
  } catch (error) {
    console.error("Error deleting event sponsor:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Get all event sponsors
const getAllEventSponsors = async (req, res) => {
  try {
    const eventSponsors = await prisma.eventSponsor.findMany();
    res.status(200).json({ success: true, eventSponsors });
  } catch (error) {
    console.error("Error fetching event sponsors:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getEventSponsorById = async (req, res) => {
  try {
    const { id } = req.params;
    const eventSponsor = await prisma.eventSponsor.findUnique({
      where: { id: parseInt(id) },
    });
    if (!eventSponsor) {
      return res.status(404).json({ success: false, message: "Event sponsor not found" });
    }
    res.status(200).json({ success: true, eventSponsor });
  } catch (error) {
    console.error("Error fetching event sponsor:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  createEventSponsor,
  deleteEventSponsorById,
  getAllEventSponsors,
  getEventSponsorById,
};
