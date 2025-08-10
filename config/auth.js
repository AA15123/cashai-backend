const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const AppleStrategy = require('passport-apple').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// JWT Secret (in production, this should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Configure Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('Google profile:', profile);
        
        // Check if user exists in database
        const db = require('../database');
        let user = await db.getUserByEmail(profile.emails[0].value);
        
        if (!user) {
            // Create new user
            const userId = await db.createUser(profile.emails[0].value, profile.displayName);
            user = await db.getUserByEmail(profile.emails[0].value);
        }
        
        // Update login method
        await db.updateUserLoginMethod(user.id, 'google');
        
        return done(null, user);
    } catch (error) {
        console.error('Google auth error:', error);
        return done(error, null);
    }
}));

// Configure Apple Strategy
passport.use(new AppleStrategy({
    clientID: process.env.APPLE_SERVICES_ID,
    teamID: process.env.APPLE_TEAM_ID,
    keyID: process.env.APPLE_KEY_ID,
    privateKeyLocation: process.env.APPLE_PRIVATE_KEY_PATH,
    callbackURL: "http://localhost:3000/auth/apple/callback",
    passReqToCallback: true
}, async (req, accessToken, refreshToken, idToken, profile, done) => {
    try {
        console.log('Apple profile:', profile);
        
        // Check if user exists in database
        const db = require('../database');
        let user = await db.getUserByEmail(profile.email);
        
        if (!user) {
            // Create new user
            const userId = await db.createUser(profile.email, profile.name?.firstName || 'Apple User');
            user = await db.getUserByEmail(profile.email);
        }
        
        // Update login method
        await db.updateUserLoginMethod(user.id, 'apple');
        
        return done(null, user);
    } catch (error) {
        console.error('Apple auth error:', error);
        return done(error, null);
    }
}));

// JWT Strategy for protecting routes
passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: JWT_SECRET
}, async (payload, done) => {
    try {
        const db = require('../database');
        const user = await db.getUserById(payload.userId);
        
        if (!user) {
            return done(null, false);
        }
        
        return done(null, user);
    } catch (error) {
        return done(error, false);
    }
}));

// Generate JWT token
function generateToken(user) {
    return jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

// Verify JWT token
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

module.exports = {
    passport,
    generateToken,
    verifyToken,
    JWT_SECRET
}; 