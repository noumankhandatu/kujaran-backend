const { check } = require('express-validator');

exports.signUpValidation = [
    check('name', "Name is required").not().isEmpty(),
    check('email', "Please Enter a Valid Email").isEmail().normalizeEmail({ gmail_remove_dots: true }),
    check('password', "Password is required").isLength({ min: 6 }),
    check('image').custom((value, { req }) => {
        if (req.file.mimetype === 'image/png' || req.file.mimetype === 'image/jpeg' || req.file.mimetype === 'image/jpg') {
            return true;
        } else {
            return false;
        }
    }).withMessage('Please upload an image of type PNG, JPEG, JPG')
];

exports.logInValidation = [
    check('email', "Please Enter a Valid Email").isEmail().normalizeEmail({ gmail_remove_dots: true }),
    check('password', "Password is required").isLength({ min: 6 }),
];

exports.forgetValidation = [
    check('email', "Please Enter a Valid Email").isEmail().normalizeEmail({ gmail_remove_dots: true }),
];
