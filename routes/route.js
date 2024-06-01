const express = require('express');
const router = express.Router();
const { signUp, logIn, deleteUser, updateUser, getUser, forget_password, getAllUsers, getUserByMe, viewerGetRiderDetails } = require('../controllers/authController')
const upload = require("../middleware/multer")
const { AuthorizeRole, authenticateUser } = require("../middleware/authenticateUser")
const { signUpValidation, logInValidation, forgetValidation } = require('../middleware/validation')

const { signUpHorse, updateHorseProfile, deleteHorse, getAllHorses, getHorseProfile } = require('../controllers/horseController')

const { createStable, updateStable, getStable, getAllStables, deleteStable } = require('../controllers/stableController')

const { createArticles, articleDressageCreated, articleEnduranceCreated, articleJumpingCreated, editArticle, deleteArticle, getArticleById, getAllArticles } = require("../controllers/articleController")

const { createEvents, getAllEvents, getEventById, updateEventById, deleteEventById } = require('../controllers/eventController')

const { assignEventsToJudge, judgeClickEventId, judgeGetClassDetails, getJudgeAll, jumpingScores, editJumpingScore, deleteJumpingScore, getAllJumpingScores, getWinnerFromJumpingScores, getClassParticipantDetails, eventAllUsersAndScores, JudgesScores } = require("../controllers/judgeController")


const { createEventSponsor, deleteEventSponsorById, getAllEventSponsors, getEventSponsorById } = require('../controllers/eventSponsor')

const { uploadPdfForm, importFromExcel } = require('../controllers/fileUploads')


const { createCompetitionClass,
    getAllCompetitionClasses,
    getCompetitionClassById,
    updateCompetitionClassById,
    deleteCompetitionClassById } = require("../controllers/classController")


const { getUpcomingEvents, getLiveEvents, getEndedEvents, createRegistration, updateRegistration, cancelRegistration, getAllRegistration, getRegistrationById, getUserRegistrations } = require('../controllers/registrationController');


const { CreatedressageScores, editDressageScores, deleteDressageScores, getAllDressageScores, getUserScoresFromAllJudges, createEnduranceScores, getAllEnduranceScores, deleteEnduranceScores, updateEnduranceScores, getScoresAuthenticateUser } = require("../controllers/dressageController")


const { dressageAllJudgesScores, viewUserScores, getremainingAllScores } = require("../controllers/allScoresController")

// user routes

router.post('/user/signUp', upload.single("image"), signUpValidation, signUp)
router.post('/user/logIn', logInValidation, logIn)
router.delete('/user/delete/:id', authenticateUser, AuthorizeRole(['SUPERVISOR']), deleteUser);
router.get('/user/:id', authenticateUser, getUser);
router.put('/users/rider/update/:id', upload.single("image"), authenticateUser, updateUser);
router.get('/user/rider/getAll', authenticateUser, AuthorizeRole(['SUPERVISOR']), getAllUsers);
router.get('/users/rider/me', authenticateUser, getUserByMe);
router.post('/users/rider/forgetPassword', forgetValidation, authenticateUser, forget_password)
router.get('/viewer/getAll/rider', viewerGetRiderDetails);



// Horse routs

router.post('/auth/rider/horse/register', upload.single("image"), signUpValidation, authenticateUser, signUpHorse)
router.put('/auth/rider/horse/update/:id', upload.single("image"), authenticateUser, updateHorseProfile);
router.delete('/auth/rider/horse/:id', authenticateUser, deleteHorse);
router.get('/auth/rider/horses', authenticateUser, getAllHorses);
router.get('/auth/rider/horse/:id', authenticateUser, getHorseProfile);


// Stables routes

router.post('/auth/rider/create/stable', upload.single("image"), signUpValidation, authenticateUser, createStable)
router.put('/auth/rider/stable/update/:id', upload.single("image"), authenticateUser, updateStable);
router.delete('/auth/rider/deleteById/stable/:id', authenticateUser, deleteStable);
router.get('/auth/rider/getAll/stables', authenticateUser, getAllStables);
router.get('/auth/rider/getByID/stable/:id', authenticateUser, getStable);


// Articles routes

router.post('/supervisor/article/create', authenticateUser, createArticles);
router.post('/supervisor/dressage/article/create', authenticateUser, articleDressageCreated);
router.post('/supervisor/showJumping/article/create', authenticateUser, articleJumpingCreated);
router.post('/supervisor/endurance/article/create', authenticateUser, articleEnduranceCreated);
router.put('/supervisor/edit/articles/:articleId', authenticateUser, AuthorizeRole(['SUPERVISOR']), editArticle);
router.get('/supervisor/articles/getAll', authenticateUser, getAllArticles);
router.get('/supervisor/articles/:articleId', authenticateUser, getArticleById);
router.delete('/supervisor/articles/delete/:articleId', authenticateUser, AuthorizeRole(['SUPERVISOR']), authenticateUser, deleteArticle);



router.post('/supervisor/event/create', upload.single("image"), authenticateUser, AuthorizeRole(['SUPERVISOR']), createEvents)
router.get('/supervisor/events/getAll', authenticateUser, getAllEvents)
router.get('/supervisor/events/getById/:id', authenticateUser, getEventById)
router.put('/supervisor/events/updateById/:id', upload.single("image"), authenticateUser, AuthorizeRole(['SUPERVISOR']), updateEventById)
router.delete('/supervisor/events/delete/:id', authenticateUser, AuthorizeRole(['SUPERVISOR']), deleteEventById)


router.post('/event/sponsor/upload', upload.single("image"),  createEventSponsor)
router.delete('/event/sponsor/delete/:id', deleteEventSponsorById)
router.get('/event/sponsor/getAll', getAllEventSponsors)
router.get('/event/sponsor/getById/:id',  getEventSponsorById)



router.post('/upload-pdf-form', upload.single('file'), uploadPdfForm);
router.get('/import/classId/:classId', importFromExcel);


// classCompetition routes

router.post("/competition/class/create", authenticateUser, createCompetitionClass)
router.get('/competition/classes/getAll', getAllCompetitionClasses)
router.get("/competition/class/getById/:id", getCompetitionClassById)
router.put("/competition/class/update/:id", updateCompetitionClassById)
router.delete("/competition/class/delete/:id", deleteCompetitionClassById)



router.get("/getAll/upcomingEvents", getUpcomingEvents)
router.get("/getAll/LiveEvents", getLiveEvents)
router.get("/getAll/EndedEvents", getEndedEvents)



router.post("/create/registrations", authenticateUser, createRegistration)
router.put("/registration/update/:id", authenticateUser, updateRegistration)
router.delete("/registration/delete/:id", authenticateUser, cancelRegistration)
router.get("/registration/get/All", getAllRegistration)
router.get("/registration/getById/:id", getRegistrationById)
router.get("/get/user/registration", authenticateUser, getUserRegistrations)



router.post("/assign/events/judge", authenticateUser, AuthorizeRole(['SUPERVISOR']), assignEventsToJudge)
router.get("/get/event/:id/judge", authenticateUser, judgeClickEventId)
router.get("/judge/events/:eventId/classes/:classId", authenticateUser, judgeGetClassDetails)
router.get("/events/:eventId/classes/:classId/userId/:userId", authenticateUser, getClassParticipantDetails)
router.get("/supervisor/get/AllJudge", authenticateUser, AuthorizeRole(['SUPERVISOR']), getJudgeAll)


router.post('/judge/showjumping/scores/user', authenticateUser, AuthorizeRole(['JUDGE','SUPERVISOR']), jumpingScores)
router.put('/update/jumpingScores', editJumpingScore)
router.delete('/jumping-scores/:id', deleteJumpingScore);
router.get('/jumping-scores/getAll', authenticateUser, getAllJumpingScores);
router.get('/jumping/winner', getWinnerFromJumpingScores);

router.get('/scores/type/:type/registrationId/:registrationId', authenticateUser, JudgesScores);




router.post("/judge/create-dressage-scores", authenticateUser, AuthorizeRole(['JUDGE','SUPERVISOR']), CreatedressageScores)
router.put('/dressage/scores/edit', authenticateUser, editDressageScores)
router.delete('/dressage/scores/:id', deleteDressageScores);
router.get('/get/All/dressage/scores', authenticateUser, getAllDressageScores);
router.get('/authenticate/user/get/scores', authenticateUser, getScoresAuthenticateUser);
router.get('/get/judge/OneUser/Scores/:userId', getUserScoresFromAllJudges);


router.post("/judge/create/endurance-scores", authenticateUser, AuthorizeRole(['JUDGE','SUPERVISOR']), createEnduranceScores)
router.get('/getJudges/endurance/scores', authenticateUser, getAllEnduranceScores);
router.delete('/Endurance/scores/:id', deleteEnduranceScores);
router.put('/update/endurance/scores/:scoreId', updateEnduranceScores);



router.get('/eventId/:eventId/userscores', authenticateUser, eventAllUsersAndScores);

router.get('/scores/registration/:registrationId', authenticateUser, AuthorizeRole(['SUPERVISOR']), dressageAllJudgesScores);
router.get('/oneJudge/scores/registration/:registrationId/user/:userId', viewUserScores);
router.get('/getremainingAllScores/registrationId/:registrationId', getremainingAllScores);

module.exports = router;

