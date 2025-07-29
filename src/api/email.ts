
import type { Notification } from '../types';

/**
 * Sends an email notification by making a POST request to a backend server.
 * The backend server is responsible for securely sending the email via an SMTP service.
 * @param notification The notification object containing the details for the email.
 * @returns A promise that resolves on success or rejects on failure.
 */
export const sendEmailNotification = async (notification: Notification): Promise<void> => {
    // This is now a relative path. Vite's proxy will handle forwarding it.
    const backendUrl = '/api/send-email';

    // The message from the notification object contains both the subject and body.
    // We can split it to send them as separate fields to the backend.
    const messageParts = notification.message.split('\n\n');
    const subject = messageParts[0] || `Update for Shipment ${notification.shipmentId}`;
    const messageBody = messageParts.slice(1).join('\n\n');

    console.log('%cSending API request to backend to send email...', 'color: blue; font-weight: bold;');
    
    try {
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                recipient: notification.recipient,
                subject: subject,
                message: messageBody,
            }),
        });

        if (!response.ok) {
            // The response from the server was not successful (e.g., 400, 500)
            const errorData = await response.json();
            throw new Error(errorData.error || `Server responded with status ${response.status}`);
        }

        console.log('%cBackend confirmed email sent successfully!', 'color: green; font-weight: bold;');
        return Promise.resolve();

    } catch (error) {
        console.error('%cError sending email via backend:', 'color: red; font-weight: bold;', error);
        // We reject the promise so the UI can show a failure state
        return Promise.reject(error);
    }
};