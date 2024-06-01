const express = require('express');
const { PrismaClient } = require("@prisma/client");
const dotenv = require("dotenv");
const router = require('./routes/route');
const webrouter = require('./routes/webroutes');
const errorExceptional = require("./exception/badRequest");
const cors = require("cors");
const bodyParser = require("body-parser");
const {Server} = require("socket.io")
const http = require("http")


const app = express();
const prisma = new PrismaClient();


const servers = http.createServer(app)
const io = new Server(servers)

process.on('uncaughtException', err => {
    console.log(`Error: ${err.stack}`);
    console.log(`Shutting down server due to uncaught exception`);
    process.exit(1);
});


dotenv.config();
app.use(express.urlencoded({ extended: true }));
app.use(express.static('uploads'));
app.use(cors());
app.use(bodyParser.json());

app.get("/api", (req, res) => {
    res.json({
        success: 1,
        message: "This is rest Api's"
    });
});

app.use('/api', router);
app.use('/', webrouter);

app.use(errorExceptional);


io.on("Connection",(socket)=>{
    console.log("A Client Connected")

    
    socket.io("Disconnect",()=>{
        console.log("Client disconnected")
    })
})


const scoresUpdates = async()=>{
    try {
        const event = await prisma.event.findMany({
            where:{
                status:"LIVE",
            },
            include:{
                CompetitionClass:{
                    include:{
                        registrations:{
                            include:{
                                user:true,
                                JumpingScore:true,
                                EnduranceScore:true,
                                JumpingScore:true
                            }
                        }
                    }
                }
            }
        })

        io.emit("live_event_scores",event)
    } catch (error) {
        console.error("Scores fetching Erros", error)
        res.status(500).json({success: false,message:"Internal server error"})

    }
}


app.post("/update-scores", async (req, res) => {
    try {
        await scoresUpdates();
        res.json({ success: true, message: "Scores updated successfully" });
    } catch (error) {
        console.error("Error updating scores:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});



const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
    console.log(`Server is running in the port ${port}`);
});

process.on('unhandledRejection', err => {
    console.log(`Error: ${err.message}`);
    console.log(`Shutting down the server due to Unhandled Promise rejections`);
    server.close(() => {
        process.exit(1);
    });
});
