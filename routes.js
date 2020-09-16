const express = require('express');

const router = express.Router();

const { check, validationResult } = require('express-validator');
const bcryptjs = require('bcryptjs');
const auth = require('basic-auth');

const models = require('./models');

// Get references to our models.
const { User, Course } = models;

router.use(express.json());

// Middleware - Handles errors across routes
function asyncHandler(cb) {
    return async(req, res, next) => {
        try {
            await cb(req, res, next);
        } catch (err) {
            next(err);
        }
    };
}

// Authentication

async function authenticateUser(req, res, next) {
    let message = null;

    // Parse the user's credentials from the Authorization header.
    const credentials = auth(req);
    // If the user's credentials are available...
    if (credentials) {
        // Attempt to retrieve the user from the data store
        // by their email address (i.e. the user's "key"
        // from the Authorization header).
        let user = await User.findAll({ where: { emailAddress: credentials.name } });
        // If a user was successfully retrieved from the data store...
        if (user) {
            user = user[0];
            // Use the bcryptjs npm package to compare the user's password
            // (from the Authorization header) to the user's password
            // that was retrieved from the data store.
            const authenticated = bcryptjs
                .compareSync(credentials.pass, user.password);
            // If the passwords match...
            if (authenticated) {
                // Then store the retrieved user object on the request object
                // so any middleware functions that follow this middleware function
                // will have access to the user's information.
                req.currentUser = user;
            } else {
                message = `Authentication failure for email address: ${user.emailAddress}`;
            }
        } else {
            message = `User not found for username: ${credentials.name}`;
        }
    } else {
        message = 'Auth header not found';
    }
    // If user authentication failed...
    if (message) {
        console.warn(message);
        // Return a response with a 401 Unauthorized HTTP status code.
        res.status(401).json({ message: 'Access Denied' });
    } else {
        // Or if user authentication succeeded...
        // Call the next() method.
        next();
    }
}

/* ----User routes----*/

//  GET /api/users 200 - Returns the currently authenticated user
router.get('/users', authenticateUser, asyncHandler(async(req, res) => {
    const user = req.currentUser;
    // Consider stringify here
    res.status(200).json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        emailAddress: user.emailAddress,
    });
}));

//  POST /api/users 201 - Creates a user, sets the Location header to "/", and returns no content
router.post('/users', [
    check('firstName')
    .exists()
    .withMessage('Please provide a value for "firstName"'),
    check('lastName')
    .exists()
    .withMessage('Please provide a value for "lastName"'),
    check('emailAddress')
    .exists()
    .withMessage('Please provide a value for "emailAddress"')
    .isEmail()
    .withMessage('Please provide a valid email address for "emailAddress"'),
    check('password')
    .exists()
    .withMessage('Please provide a value for "password"'),
], asyncHandler(async(req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Use the Array `map()` method to get a list of error messages.
        const errorMessages = errors.array().map((error) => error.msg);
        // Return the validation errors to the client.
        res.status(400).json({ errors: errorMessages });
    } else {
        const user = req.body;
        user.password = bcryptjs.hashSync(user.password);
        await User.create(user);
        res.location('/');
        res.status(201).end();
    }
}));

/* ----Course routes---- */

//  GET /api/courses 200 - Returns a list of courses (including the user that owns each course)
router.get('/courses', asyncHandler(async(req, res) => {
    const courses = await Course.findAll({
        attributes: ['id', 'title', 'description', 'estimatedTime', 'materialsNeeded'],
        include: {
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'emailAddress'],
        },
    });
    res.status(200).json(courses);
}));

//  GET /api/courses/:id 200 - Returns the course (including the user that owns the course)
router.get('/courses/:id', asyncHandler(async(req, res) => {
    const course = await Course.findByPk(req.params.id, {
        attributes: ['id', 'title', 'description', 'estimatedTime', 'materialsNeeded'],
        include: {
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'emailAddress'],
        },
    });
    res.status(200).json(course);
}));

/*  POST /api/courses 201 - Creates a course, sets the Location header to the URI for the course,
and returns no content */
router.post('/courses', authenticateUser, [
    check('title')
    .exists()
    .withMessage('Please provide a value for "title"'),
    check('description')
    .exists()
    .withMessage('Please provide a value for "description"'),
], asyncHandler(async(req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        // Use the Array `map()` method to get a list of error messages.
        const errorMessages = errors.array().map((error) => error.msg);
        // Return the validation errors to the client.
        res.status(400).json({ errors: errorMessages });
    } else {
        const course = await Course.create(req.body);
        res.location(`/courses/${course.id}`);
        res.status(201).end();
    }
}));

// PUT /api/courses/:id 204 - Updates a course and returns no content
router.put('/courses/:id', authenticateUser, [
    check('title')
    .exists()
    .withMessage('Please provide a value for "title"'),
    check('description')
    .exists()
    .withMessage('Please provide a value for "description"'),
], asyncHandler(async(req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        // Use the Array `map()` method to get a list of error messages.
        const errorMessages = errors.array().map((error) => error.msg);
        // Return the validation errors to the client.
        res.status(400).json({ errors: errorMessages });
    } else {
        const course = await Course.findByPk(req.params.id);
        if (req.currentUser.id === course.userId) {
            await course.update(req.body);
            res.status(204).end();
        } else {
            res.status(403).end();
        }
    }
}));

//  DELETE /api/courses/:id 204 - Deletes a course and returns no content
router.delete('/courses/:id', authenticateUser, asyncHandler(async(req, res) => {
    const course = await Course.findByPk(req.params.id);
    if (req.currentUser.id === course.userId) {
        await course.destroy();
        res.status(204).end();
    } else {
        res.status(403).end();
    }
}));

module.exports = router;