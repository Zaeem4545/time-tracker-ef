const nodemailer = require('nodemailer');
const db = require('../config/db');

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Send an email
 * @param {string|string[]} to - Recipient email(s)
 * @param {string} subject - Email subject
 * @param {string} html - Email body (HTML)
 */
async function sendEmail(to, subject, html) {
    if (!to || (Array.isArray(to) && to.length === 0)) {
        console.log('No recipients for email:', subject);
        return;
    }

    // Check if SMTP is configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        console.warn('SMTP not configured. Email not sent:', subject);
        console.log('To:', to);
        console.log('Content:', html);
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: `"${process.env.APP_NAME || 'Time Tracker'}" <${process.env.SMTP_USER}>`,
            to: Array.isArray(to) ? to.join(',') : to,
            subject: subject,
            html: html,
        });

        console.log('Email sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        // Don't throw, just log error so main flow doesn't break
    }
}

/**
 * Get emails of users following a project
 * @param {number} projectId 
 */
async function getProjectFollowerEmails(projectId) {
    try {
        const [rows] = await db.query(
            `SELECT u.email 
       FROM project_followers pf
       JOIN users u ON pf.user_id = u.id
       WHERE pf.project_id = ?`,
            [projectId]
        );
        return rows.map(r => r.email);
    } catch (error) {
        console.error('Error getting project follower emails:', error);
        return [];
    }
}

/**
 * Get email of a specific user
 * @param {number} userId 
 */
async function getUserEmail(userId) {
    if (!userId) return null;
    try {
        const [rows] = await db.query('SELECT email FROM users WHERE id = ?', [userId]);
        return rows[0] ? rows[0].email : null;
    } catch (error) {
        console.error(`Error getting email for user ${userId}:`, error);
        return null;
    }
}

module.exports = {
    sendEmail,
    getProjectFollowerEmails,
    getUserEmail
};
