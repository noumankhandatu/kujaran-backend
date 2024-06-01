const { PrismaClient } = require("@prisma/client");
const catchAsyncErrors = require("../exception/catchAsyncError");
const bcrypt = require("bcrypt");
const cloudinary = require("../utils/cloudinary");
const jwt = require("jsonwebtoken");
const randomString = require("randomstring");
const sendMail = require("../middleware/sendMail");
const { validationResult } = require("express-validator");

const prisma = new PrismaClient();

// SignUp User
const signUp = catchAsyncErrors(async (req, res) => {
  try {
    const { name, email, password, nationality, phone, dob, gender } = req.body;
    const { file } = req;
    console.log("data of the user", req.body);

    // Check if password is provided
    if (!password) {
      return res.status(400).json({ success: false, message: "Password is required" });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Upload image to cloud storage (Cloudinary)
    let imageUrl = null;
    if (file) {
      const cloudinaryResponse = await cloudinary.uploader.upload(file.path);
      imageUrl = cloudinaryResponse.secure_url;
    }
    const dobISO = new Date(dob).toISOString();

    // Create new user with image URL
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "RIDER",
        nationality,
        dob: dobISO,
        phone,
        gender,
        image: imageUrl,
        token: null,
        is_verified: false,
      },
    });

    // Send verification email
    const mailSubject = "Mail Verification";
    const randomToken = randomString.generate();
    // const verificationLink = `http://localhost:5000/mail-verification?token=${randomToken}`;
    const emailVerificationUrl = `${process.env.CLIENT_URL}${process.env.EMAIL_REDIRECT_PATH}?token=${randomToken}`;
    const content = `<p>Hii ${name}, Please <a href="${emailVerificationUrl}">Verify</a> your Mail.</p>`;
    await sendMail(email, mailSubject, content);

    // Update user's token in the database
    await prisma.user.update({
      where: { id: newUser.id },
      data: {
        token: randomToken, // Update the token field with the generated token
      },
    });

    // Send response
    res.json({ success: true, message: "User registered successfully", user: newUser });
  } catch (error) {
    console.error("Error in user registration:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Login User

const logIn = catchAsyncErrors(async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const passMatch = await bcrypt.compare(password, user.password);
    if (!passMatch) {
      return res.status(401).json({ success: false, message: "Incorrect password" });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.cookie("token", token, { httpOnly: true, secure: true });

    res
      .status(200)
      .json({ success: true, message: "User logged in successfully", token, role: user.role }); // Removed unnecessary await
  } catch (error) {
    console.error("Error in user login:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

const deleteUser = catchAsyncErrors(async (req, res) => {
  const userId = req.params.id;

  try {
    await prisma.$transaction([
      prisma.registration.deleteMany({ where: { userId: Number(userId) } }),
      prisma.competitionClass.deleteMany({ where: { userId: Number(userId) } }),
      prisma.event.deleteMany({ where: { userId: Number(userId) } }),
      prisma.jumpingScore.deleteMany({ where: { userId: Number(userId) } }),
      prisma.user.delete({ where: { id: Number(userId) } }),
    ]);

    res.json({ success: true, message: "User and related records deleted successfully" });
  } catch (error) {
    console.error("Error deleting user and related records:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

const updateUser = catchAsyncErrors(async (req, res) => {
  try {
    const userId = req.params.id;
    const userDataToUpdate = req.body;

    // Validate if userId is provided
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    // Validate if userDataToUpdate is provided and not empty
    if (!userDataToUpdate || Object.keys(userDataToUpdate).length === 0) {
      return res.status(400).json({ success: false, message: "User data to update is required" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(userId) },
      data: userDataToUpdate,
    });

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

const getUser = catchAsyncErrors(async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        JumpingScore: true,
        DressageScore: true,
        EnduranceScore: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error("Error getting user:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

const getUserByMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        Stable: true,
        horses: true,
        articles: true,
        event: true,
        registrations: {
          include: {
            event: {
              include: {
                sponsors: true,
              },
            },
            class: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        horses: true,
        articles: true,
        registrations: {
          include: {
            event: true,
            class: true,
          },
        },
      },
    });

    res.status(200).json(users);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const viewerGetRiderDetails = catchAsyncErrors(async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: "RIDER",
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

const verifyMail = async (req, res) => {
  try {
    const token = req.body.token;
    const user = await prisma.user.findFirst({
      where: { token: token },
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          token: token,
          is_verified: true,
        },
      });

      return res.status(200).json({ success: true, message: "Mail Verified Successfully!" });
    } else {
      return res.status(401).json({ success: false, message: "Something went wrong !" });
    }
  } catch (error) {
    console.error("Error verifying mail:", error);
    return res.status(500).send("Internal server error");
  }
};

const forget_password = catchAsyncErrors(async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        message: "Email doesn't exist",
      });
    }

    const randomStrings = randomString.generate();

    const mailSubject = "Forget Password";
    const content = `<p>Hii, ${user.name}, Please <a href="http://localhost:5000/reset-password?token=${randomStrings}">Click Here</a> to reset your password.</p>`;

    await sendMail(email, mailSubject, content);

    // Insert the reset token into the database
    const resetEntry = await prisma.passwordReset.create({
      data: {
        email: user.email,
        token: randomStrings,
      },
    });

    return res.status(200).json({
      message: "Mail sent successfully for resetting the password!",
      resetEntry,
    });
  } catch (error) {
    console.error("Error sending mail for password reset:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const resetPasswordLoad = catchAsyncErrors(async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) {
      return res.render("404");
    }

    // Find the PasswordReset entry by token
    const resetEntry = await prisma.passwordReset.findFirst({
      where: {
        token: token,
      },
    });

    if (!resetEntry) {
      return res.render("404");
    }

    // Find the user associated with the reset token
    const user = await prisma.user.findFirst({
      where: {
        email: resetEntry.email,
      },
    });

    if (!user) {
      return res.render("404");
    }

    res.render("reset-password", { user: user });
  } catch (error) {
    console.error("Error loading reset password page:", error);
    res.render("500"); // Render a generic error page
  }
});

const resetPassword = catchAsyncErrors(async (req, res) => {
  try {
    const { password, confirm_password, user_id, email } = req.body;

    // Parse user_id as an integer
    const userId = parseInt(user_id, 10);

    if (password !== confirm_password) {
      return res.render("reset-password", {
        error_message: "Passwords do not match",
        user: { id: user_id, email: email },
      });
    }

    const hashedPassword = await bcrypt.hash(confirm_password, 10);

    // Delete the password reset entry
    await prisma.passwordReset.deleteMany({
      where: { email: email },
    });

    // Update the user's password using the parsed user_id
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return res.render("message", { message: "Password Reset Successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.render("500"); // Render a generic error page
  }
});

module.exports = {
  signUp,
  logIn,
  deleteUser,
  updateUser,
  getUser,
  verifyMail,
  forget_password,
  getAllUsers,
  resetPasswordLoad,
  resetPassword,
  getUserByMe,
  viewerGetRiderDetails,
};
