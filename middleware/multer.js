const multer = require('multer');
const path = require('path');

// Define storage for the uploaded files
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Determine the destination directory based on file type
        if (file.mimetype.startsWith('image')) {
            cb(null, path.join(__dirname, '../uploads'));
        } else if (file.mimetype === 'application/pdf') {
            cb(null, path.join(__dirname, '../uploads'));
        } else {
            cb(null, path.join(__dirname, '../uploads'));
        }
    },
    filename: function (req, file, cb) {
    
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);

        
        const extension = path.extname(file.originalname);
        cb(null, file.originalname); // Use original filename
    }
});

// Check file type
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image') || file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type'), false);
    }
};;

// Initialize upload middleware
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
    fileFilter: fileFilter
})


module.exports = upload;
