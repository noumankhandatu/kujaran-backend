const { PrismaClient } = require("@prisma/client");
const catchAsyncErrors = require("../exception/catchAsyncError");
const cloudinary = require("../utils/cloudinary");

const prisma = new PrismaClient();

const getJudgeAll = catchAsyncErrors(async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: "JUDGE",
      },
      include: {
        horses: true,
        Stable: true,
        registrations: {
          include: {
            class: true,
            event: true,
          },
        },
      },
    });

    res.status(200).json(users);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const assignEventsToJudge = catchAsyncErrors(async (req, res) => {
  try {
    const { eventId, userId } = req.body;

    // Fetch the event and judge from the database
    const event = await prisma.event.findUnique({ where: { id: parseInt(eventId) } });
    const user = await prisma.user.findUnique({
      where: {
        role: "JUDGE",
        id: parseInt(userId),
      },
    });

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if the event is already assigned to the user
    if (event.userId === parseInt(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Event is already assigned to the user" });
    }

    // Assign the judge to the event
    await prisma.event.update({
      where: { id: parseInt(eventId) },
      data: {
        userId: userId,
      },
    });

    res.status(200).json({ success: true, message: "Event assigned to judge successfully" });
  } catch (error) {
    console.error("Error assigning event to judge:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

const judgeClickEventId = catchAsyncErrors(async (req, res) => {
  try {
    const { id } = req.params;
    const event = await prisma.event.findUnique({
      where: { id: parseInt(id) },
      include: {
        CompetitionClass: true,
        sponsors: true,
      },
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

const judgeGetClassDetails = catchAsyncErrors(async (req, res) => {
  try {
    const { eventId, classId } = req.params;

    const competitionClass = await prisma.competitionClass.findUnique({
      where: { id: parseInt(classId) },
      include: {
        registrations: {
          include: {
            user: true,
            horse: {
              select: {
                id: true,
                name: true,
              },
            },
          },

        },
        Event: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!competitionClass || competitionClass.eventId !== parseInt(eventId)) {
      return res.status(404).json({ success: false, message: "Class not found for this event" });
    }

    const classParticipantsCount = competitionClass.registrations.length;

    const participants = competitionClass.registrations.map(registration => ({
      registrationId: registration.id,
      userId: registration.user.id,
      userName: registration.user.name,
      userEmail: registration.user.email,
      horseDetails: registration.horse,
      extimateStartTime: registration.startDate,
      endTime: registration.endDate
    }));

    const classDetails = {
      classId: competitionClass.id,
      className: competitionClass.className,
      classStatus: competitionClass.classStatus || "No Status",
      classStartTime: competitionClass.classStartTime,
      classParticipantsCount,
      eventStatus: competitionClass.Event.status || "No Event Status",
      participants,
    };

    res.status(200).json({ success: true, classDetails });
  } catch (error) {
    console.error("Error fetching class details:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

const getClassParticipantDetails = catchAsyncErrors(async (req, res) => {
  try {
    const { eventId, classId, userId } = req.params;

    const registration = await prisma.registration.findFirst({
      where: {
        classId: parseInt(classId),
        eventId: parseInt(eventId),
        userId: parseInt(userId),
      },
      include: {
        user: true,
        horse: true,
        event: true,
        class: true,
        JumpingScore: true,
        DressageScore: true,
        EnduranceScore: true,
      },
    });

    if (!registration) {
      return res
        .status(404)
        .json({ success: false, message: "User not found in class participants" });
    }

    res.status(200).json({ success: true, participantDetails: registration });
  } catch (error) {
    console.error("Error fetching participant details:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

const eventAllUsersAndScores = catchAsyncErrors(async (req, res) => {
  try {
    const { eventId } = req.params;

    // Fetch all users for the event along with their scores
    const usersWithScores = await prisma.user.findMany({
      where: {
        events: {
          some: {
            id: parseInt(eventId),
          },
        },
      },
      include: {
        JumpingScore: true,
        DressageScore: true,
        EnduranceScore: true,
      },
    });

    if (!usersWithScores) {
      return res.status(404).json({ success: false, message: "No users found for this event" });
    }

    // Determine how many scores a user can create
    const usersWithScoreCounts = usersWithScores.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      jumpingScoresCount: user.JumpingScore.length,
      dressageScoresCount: user.DressageScore.length,
      enduranceScoresCount: user.EnduranceScore.length,
    }));

    res.status(200).json({ success: true, usersWithScoreCounts });
  } catch (error) {
    console.error("Error fetching event users and scores:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

const jumpingScores = catchAsyncErrors(async (req, res) => {
  console.log("User:", req.user);
  const { registrationId, time, faults } = req.body;
  const userId = req.user.id;
  try {
    // Fetch the registration to ensure it exists
    const registration = await prisma.registration.findUnique({
      where: { id: parseInt(registrationId) },
      include: { class: true }, // Include the class details
    });

    // Check if the registration exists
    if (!registration) {
      return res.status(404).json({ success: false, message: "Registration not found" });
    }

    // Check if the registration class is of type "JumpingScores"
    if (registration.class.type !== "SHOW_JUMPING") {
      return res
        .status(400)
        .json({ success: false, message: "Registration class is not for jumping scores" });
    }

    // Calculate total score
    const totalScore = parseInt(faults) * 10 + parseInt(time);

    // Determine value based on faults
    let value;
    if (parseInt(faults) === 999) value = "E-J";
    else if (parseInt(faults) === 998) value = "RF-J";
    else if (parseInt(faults) === 997) value = "WD-J";
    else if (parseInt(faults) === 996) value = "R-J";
    else if (parseInt(faults) === 995) value = "DQ-J";
    else if (parseInt(faults) === 994) value = "--J";

    const jumpingScore = await prisma.jumpingScore.create({
      data: {
        faults: parseInt(faults),
        time: parseFloat(time),
        totalScore,
        value,
        user: { connect: { id: userId } },
        Registration: { connect: { id: registrationId } },
      },
    });

    // Respond with the created jumping score
    return res.status(201).json({ jumpingScore });
  } catch (error) {
    console.error("Error creating jumping score:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

const editJumpingScore = catchAsyncErrors(async (req, res) => {
  const { id, faults, time } = req.body;

  try {
    const jumpingScore = await prisma.jumpingScore.findUnique({
      where: { id: parseInt(id) },
    });

    if (!jumpingScore) {
      return res.status(404).json({ message: "Jumping score not found" });
    }

    // Calculate total score
    const totalScore = parseInt(faults) * 10 + parseInt(time);

    // Determine value based on faults
    let value;
    if (parseInt(faults) === 999) value = "E-J";
    else if (parseInt(faults) === 998) value = "RF-J";
    else if (parseInt(faults) === 997) value = "WD-J";
    else if (parseInt(faults) === 996) value = "R-J";
    else if (parseInt(faults) === 995) value = "DQ-J";
    else value = "--J";

    const updatedJumpingScore = await prisma.jumpingScore.update({
      where: { id: parseInt(id) },
      data: {
        faults: parseInt(faults),
        time: parseFloat(time),
        totalScore,
        value,
      },
    });

    return res.status(200).json({ success: true, jumpingScore: updatedJumpingScore });
  } catch (error) {
    console.error("Error updating jumping score:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

const deleteJumpingScore = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;

  try {
    const jumpingScore = await prisma.jumpingScore.findUnique({
      where: { id: parseInt(id) },
    });

    if (!jumpingScore) {
      return res.status(404).json({ message: "Jumping score not found" });
    }

    await prisma.jumpingScore.delete({
      where: { id: parseInt(id) },
    });

    return res.status(200).json({ message: "Jumping score deleted successfully" });
  } catch (error) {
    console.error("Error deleting jumping score:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

const getAllJumpingScores = catchAsyncErrors(async (req, res) => {
  try {
    // Fetch all jumping scores from the database
    const jumpingScores = await prisma.jumpingScore.findMany({
      include: {
        Registration: {
          include: {
            user: true,
            horse: true,
            class: true,
            event: true,
          },
        },
        user: true,
      },
      orderBy: [
        { faults: "desc" }, // Order by faults in descending order
        { time: "desc" }, // Then order by time in descending order
      ],
    });

    // Respond with the array of jumping scores
    return res.status(200).json({ jumpingScores });
  } catch (error) {
    console.error("Error fetching jumping scores:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

const JudgesScores = catchAsyncErrors(async (req, res) => {
  try {
    const { registrationId, type } = req.params;

    if (!type || !["SHOW_JUMPING", "DRESSAGE", "ENDURANCE"].includes(type)) {
      return res.status(400).json({ message: "Invalid competition class type" });
    }

    let allScores;

    if (type === "SHOW_JUMPING") {
      allScores = await prisma.jumpingScore.findMany({
        where: {
          registrationId: parseInt(registrationId),
        },
        include: {
          Registration: {
            include: {
              user: true,
              horse: true,
              class: true,
              event: true,
            },
          },
          user: true,
        },
        orderBy: [
          { faults: "desc" }, // Order by faults in descending order
          { time: "desc" }, // Then order by time in descending order
        ],
      });
    } else if (type === "DRESSAGE") {
      allScores = await prisma.dressageScore.findMany({
        where: {
          registrationId: parseInt(registrationId),
        },
        include: {
          user: true,
          horse: true,
          class: true,
          event: true,
        },
        orderBy: { totalScore: "asc" }, // Order by ascending total score for dressage
      });
    } else if (type === "ENDURANCE") {
      allScores = await prisma.enduranceScore.findMany({
        where: {
          registrationId: parseInt(registrationId),
        },
        include: {
          user: true,
          horse: true,
          class: true,
          event: true,
        },
        orderBy: { elapsedTime: "asc" }, // Order by ascending elapsed time for endurance
      });
    }

    return res.status(200).json({ allScores });
  } catch (error) {
    console.error("Error fetching scores:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

const getWinner = (jumpingScores) => {
  const sortedScores = jumpingScores.sort((a, b) => {
    if (a.faults === b.faults) {
      return a.time - b.time; // Sort by time if penalties are equal
    }
    return b.faults - a.faults; // Sort by penalties in descending order
  });

  // The first element in the sorted array will be the winner (lowest penalties and fastest time)
  const winner = sortedScores[0];

  return winner;
};

const getWinnerFromJumpingScores = catchAsyncErrors(async (req, res) => {
  try {
    const jumpingScores = await prisma.jumpingScore.findMany({
      include: {
        Registration: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            horse: true,
          },
        },
      },
      orderBy: [{ faults: "desc" }, { time: "desc" }],
    });

    if (!jumpingScores || jumpingScores.length === 0) {
      return res.status(404).json({ message: "Jumping scores not found" });
    }

    // Call the getWinner function to determine the winner
    const winner = getWinner(jumpingScores);

    return res.status(200).json({ winner });
  } catch (error) {
    console.error("Error getting winner from jumping scores:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = {
  assignEventsToJudge,
  judgeClickEventId,
  judgeGetClassDetails,
  getJudgeAll,
  jumpingScores,
  editJumpingScore,
  deleteJumpingScore,
  getAllJumpingScores,
  getWinnerFromJumpingScores,
  getClassParticipantDetails,
  eventAllUsersAndScores,
  JudgesScores,
};
