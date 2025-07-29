// Handling the sending of event reminders using Cron

// Load environment variables (for mock data and DB creds later)
require('dotenv').config();

// Scheduler library
const cron = require('node-cron');

const {fetchEvents} = require('../mongoDB/dbHandlers');

// Date helpers from date-fns
const {parseISO,differenceInCalendarDays,format} = require('date-fns');

async function buildMessage(event) {
    // Parse event date
    const eventDate = parseISO(event.eventDate);
    // Format the date for display
    const formattedDate = format(eventDate, 'MMMM dd, yyyy'); // e.g., "October 23, 2025"
    // Build the message
    console.log(`\n`);
    console.log(`[In Cron]: Building message for event: ${event.eventName}`);
    return ( `Reminder: ${event.eventName} is happening on ${formattedDate} at ${event.eventTime} in ${event.eventLocation}.`);
}

async function processReminders() {
    const today = new Date();

    console.log(`\n`);
    console.log(`[In Cron]: Running processReminders at ${today.toISOString()}`);

    const events = await fetchEvents(); // Fetch events from MongoDB

    for(const event of events) {
        const eventDate = parseISO(event.eventDate);
        const daysUntilEvent = differenceInCalendarDays(eventDate, today);
        console.log(`\n`);
        console.log(`[In Cron]: Checking event: ${event.eventName}, current event date is ${event.eventDate} - Days until event: ${daysUntilEvent}`);

        if(daysUntilEvent === 1 || daysUntilEvent === 3) {
            const message = await buildMessage(event);
            console.log(`\n`);
            console.log(`[In Cron]: Sending reminder for event: "${message}"`);
            for(const contactId of event.contactIds) {
                console.log(`[MOCK PUSH] Sending to contact ID: ${contactId} containing message: "${message}"`);
            }
        }
    }
}
// cron.schedule(`*/15 * * * * *`, () => { // Cron job every 15 seconds for testing
//     console.log('[In Cron]: Running reminder job...');
//     processReminders().catch(console.error);
// })

cron.schedule(`0 10 * * *`, () => { // Daily at 10:00 AM
    console.log('[In Cron]: Running daily reminder job...');
    processReminders().catch(console.error);
});


// If you run `node cron/sendReminders.js` directly, invoke the process:
if (require.main === module) {
  processReminders()
    .then(() => {
        console.log('✅ processReminders completed');
        process.exit(0); // Needs to be removed for production, but shuts Cron down after running once manually
    })
    .catch(err => {
      console.error('❌ processReminders error:', err);
      process.exit(1);
    });
}
