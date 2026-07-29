/**
 * Firebase Cloud Function: sendWelcomeEmailOnSignup
 * Triggers when a new user document is created or updated with completed onboarding in Firestore,
 * sending an automated welcome email using Nodemailer / SendGrid.
 */

import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentUpdated, onDocumentCreated } from 'firebase-functions/v2/firestore';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER || 'apikey',
    pass: process.env.SMTP_PASS || process.env.SENDGRID_API_KEY || 'mock_key',
  },
});

export const onUserSignupWelcome = onDocumentCreated('users/{userId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) return null;
  const userData = snapshot.data();

  const { email, name, company } = userData;
  if (!email) return null;

  try {
    await transporter.sendMail({
      from: '"Fourdoor AI Growth" <welcome@fourdoor.ai>',
      to: email,
      subject: `Welcome to Fourdoor AI, ${name || 'there'}! 🚀`,
      text: `Hi ${name || 'there'},\n\nWelcome to Fourdoor AI! Your account${company ? ` for ${company}` : ''} has been successfully created.`,
      html: `<div><h2>Welcome to Fourdoor AI!</h2><p>Hi ${name || 'there'}, your account is ready.</p></div>`,
    });
    console.log(`Welcome email triggered via Firebase Cloud Function for ${email}`);
  } catch (err) {
    console.error('Error sending welcome email in cloud function:', err);
  }
  return null;
});

export const onUserOnboardingCompleted = onDocumentUpdated('users/{userId}', async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  if (!beforeData || !afterData) return null;

  // Trigger if onboarding was just completed or updated with niche/goal
  const justCompleted = (!beforeData.onboarding || Object.keys(beforeData.onboarding || {}).length === 0) &&
    afterData.onboarding && Object.keys(afterData.onboarding || {}).length > 0;

  if (justCompleted && afterData.email) {
    try {
      await transporter.sendMail({
        from: '"Fourdoor AI Growth" <welcome@fourdoor.ai>',
        to: afterData.email,
        subject: `Your AI Growth Engine is live, ${afterData.name || 'there'}! 🎯`,
        text: `Hi ${afterData.name || 'there'},\n\nYou have successfully completed onboarding. Your lead pipeline and Kanban board are fully initialized.`,
        html: `<div><h2>Your AI Growth Engine is Live! 🚀</h2><p>Hi ${afterData.name || 'there'}, onboarding is complete. Jump into your Kanban dashboard to manage your generated leads.</p></div>`,
      });
      console.log(`Automated welcome & onboarding completion email sent to ${afterData.email}`);
    } catch (err) {
      console.error('Failed to send onboarding completion email:', err);
    }
  }
  return null;
});
