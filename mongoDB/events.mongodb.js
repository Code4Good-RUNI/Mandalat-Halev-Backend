/* global use, db */
// MongoDB Playground

// Select the database
use('MandalatHalevDB');

// Clear out any old mock data
console.log('In DB: Dropping existing events collection...');
db.getCollection('events').drop();

// Insert mock events matching your fields
console.log('In DB: Inserting mock events...');

db.getCollection('events').insertMany([ // This will create a collection named 'events' with the specified fields
  {
    eventName: 'Concert at The Dome',
    eventDate: new Date('2025-10-23'),
    eventTime: '19:00',
    eventLocation: 'The Heart Dome',
    contactIds: ['c1', 'c2']
  },
  {
    eventName: 'Park Yoga Session',
    eventDate: new Date('2025-07-30'),
    eventTime: '09:00',
    eventLocation: 'Central Park',
    contactIds: ['c3']
  },
  {
    eventName: 'Art Gallery Opening',
    eventDate: new Date('2025-08-01'),
    eventTime: '14:30',
    eventLocation: 'Museum of Modern Art',
    contactIds: ['c1', 'c4', 'c5']
  },
  {
    eventName: 'Movie Night Under the Stars',
    eventDate: new Date('2025-07-30'),
    eventTime: '20:00',
    eventLocation: 'Rooftop Cinema',
    contactIds: ['c2', 'c3']
  },
  {
    eventName: 'Beach Volleyball Tournament',
    eventDate: new Date('2025-07-30'),
    eventTime: '16:00',
    eventLocation: 'Sunny Beach',
    contactIds: ['c4']
  },
  {
    eventName: 'Weekend Hiking Trip',
    eventDate: new Date('2025-08-01'),
    eventTime: '08:00',
    eventLocation: 'Blue Mountain Trail',
    contactIds: ['c1', 'c5']
  },
  {
    eventName: 'Outdoor Painting Class',
    eventDate: new Date('2025-08-01'),
    eventTime: '11:00',
    eventLocation: 'Central Park Meadow',
    contactIds: ['c3']
  },
  {
    eventName: 'Jazz in the Park Concert',
    eventDate: new Date('2025-08-01'),
    eventTime: '18:00',
    eventLocation: 'Riverside Park',
    contactIds: ['c2', 'c4']
  },
  // {
  //   eventName: 'Wine Tasting Evening',
  //   eventDate: new Date('2025-09-10'),
  //   eventTime: '19:30',
  //   eventLocation: 'Vineyard Estate',
  //   contactIds: ['c1', 'c2']
  // },
  // {
  //   eventName: 'Stand-up Comedy Show',
  //   eventDate: new Date('2025-08-15'),
  //   eventTime: '21:00',
  //   eventLocation: 'Downtown Comedy Club',
  //   contactIds: ['c3']
  // },
  // {
  //   eventName: 'Culinary Workshop',
  //   eventDate: new Date('2025-10-05'),
  //   eventTime: '17:00',
  //   eventLocation: 'Culinary Studio',
  //   contactIds: ['c4', 'c5']
  // },
  // {
  //   eventName: 'Board Game Marathon',
  //   eventDate: new Date('2025-11-20'),
  //   eventTime: '14:00',
  //   eventLocation: 'Game Hub',
  //   contactIds: ['c2', 'c3']
  // },
  // {
  //   eventName: 'Rock Climbing Session',
  //   eventDate: new Date('2025-12-01'),
  //   eventTime: '10:00',
  //   eventLocation: 'Climb Center',
  //   contactIds: ['c1']
  // }
]);

// Verify the insert worked
console.log(`In DB: Inserted mock events: ${JSON.stringify(db.getCollection('events').find().toArray(), null, 2)}`);
