/**
 * Sample Data for Onboarding Demo Mode
 *
 * Provides realistic sample data for new organizations to explore
 * the platform without entering their own data first.
 */

// Types for sample data
export interface SampleCustomer {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  source: string;
  notes?: string;
}

export interface SampleJob {
  title: string;
  description: string;
  type: 'repair' | 'installation' | 'maintenance' | 'inspection' | 'emergency';
  status: 'lead' | 'scheduled' | 'in_progress' | 'completed' | 'canceled';
  priority: 'low' | 'normal' | 'high' | 'emergency';
  estimatedValue: number; // cents
  customerIndex: number; // Reference to customer array
  scheduledDaysFromNow?: number; // Relative scheduling
  scheduledHour?: number;
  notes?: string;
}

export interface SampleConversation {
  customerIndex: number;
  channel: 'sms' | 'phone';
  status: 'open' | 'pending' | 'resolved';
  aiHandled: boolean;
  messages: SampleMessage[];
}

export interface SampleMessage {
  content: string;
  direction: 'inbound' | 'outbound';
  senderType: 'customer' | 'user' | 'ai';
  minutesAgo: number; // Relative timing
}

export interface SampleReview {
  platform: 'google' | 'yelp' | 'facebook';
  rating: number;
  content: string;
  reviewerName: string;
  daysAgo: number; // Relative timing
  responded: boolean;
  response?: string;
}

// Sample Customers (5)
export const sampleCustomers: SampleCustomer[] = [
  {
    firstName: 'Sarah',
    lastName: 'Johnson',
    phone: '+15551234001',
    email: 'sarah.j@example.com',
    address: '123 Oak Street',
    city: 'Austin',
    state: 'TX',
    zip: '78701',
    source: 'google',
    notes: 'Prefers morning appointments. Has a dog.',
  },
  {
    firstName: 'Michael',
    lastName: 'Chen',
    phone: '+15551234002',
    email: 'mchen@example.com',
    address: '456 Maple Avenue',
    city: 'Austin',
    state: 'TX',
    zip: '78702',
    source: 'referral',
    notes: 'Referred by the Johnsons. Commercial property manager.',
  },
  {
    firstName: 'Emily',
    lastName: 'Rodriguez',
    phone: '+15551234003',
    email: 'emily.r@example.com',
    address: '789 Pine Lane',
    city: 'Round Rock',
    state: 'TX',
    zip: '78664',
    source: 'web_form',
  },
  {
    firstName: 'David',
    lastName: 'Thompson',
    phone: '+15551234004',
    email: 'dthompson@example.com',
    address: '321 Cedar Court',
    city: 'Austin',
    state: 'TX',
    zip: '78745',
    source: 'yelp',
    notes: 'Elderly homeowner. May need help accessing water heater.',
  },
  {
    firstName: 'Lisa',
    lastName: 'Martinez',
    phone: '+15551234005',
    email: 'lisa.m@example.com',
    address: '567 Birch Boulevard',
    city: 'Georgetown',
    state: 'TX',
    zip: '78626',
    source: 'google',
    notes: 'New construction home. First-time homeowner.',
  },
];

// Sample Jobs (8) - various statuses and types
export const sampleJobs: SampleJob[] = [
  // Lead - just came in
  {
    title: 'Kitchen faucet leak',
    description: 'Customer reports dripping faucet in kitchen. Possibly needs replacement.',
    type: 'repair',
    status: 'lead',
    priority: 'normal',
    estimatedValue: 15000, // $150
    customerIndex: 0,
    notes: 'Customer said it started last week.',
  },
  // Scheduled for tomorrow
  {
    title: 'Water heater installation',
    description: 'Replace 40-gallon gas water heater. Customer has already purchased new unit.',
    type: 'installation',
    status: 'scheduled',
    priority: 'normal',
    estimatedValue: 45000, // $450
    customerIndex: 1,
    scheduledDaysFromNow: 1,
    scheduledHour: 9,
    notes: 'Unit is in garage. Need to bring gas flex line.',
  },
  // Scheduled for today
  {
    title: 'Clogged drain - bathroom',
    description: 'Main bathroom sink draining slowly. May need to snake.',
    type: 'repair',
    status: 'scheduled',
    priority: 'normal',
    estimatedValue: 12500, // $125
    customerIndex: 2,
    scheduledDaysFromNow: 0,
    scheduledHour: 14,
  },
  // In progress
  {
    title: 'Toilet replacement',
    description: 'Replace old toilet with customer-provided low-flow model.',
    type: 'installation',
    status: 'in_progress',
    priority: 'normal',
    estimatedValue: 25000, // $250
    customerIndex: 3,
    scheduledDaysFromNow: 0,
    scheduledHour: 10,
    notes: 'Currently on site. Old toilet removed.',
  },
  // Completed yesterday
  {
    title: 'Annual plumbing inspection',
    description: 'Full home plumbing inspection. Check water heater, main shutoff, fixtures.',
    type: 'inspection',
    status: 'completed',
    priority: 'low',
    estimatedValue: 9900, // $99
    customerIndex: 4,
    scheduledDaysFromNow: -1,
    scheduledHour: 11,
    notes: 'Inspection complete. Recommended water heater flush.',
  },
  // Emergency - completed
  {
    title: 'EMERGENCY: Burst pipe',
    description: 'Pipe burst in basement. Water shut off. Needs immediate repair.',
    type: 'emergency',
    status: 'completed',
    priority: 'emergency',
    estimatedValue: 75000, // $750
    customerIndex: 0,
    scheduledDaysFromNow: -3,
    scheduledHour: 18,
    notes: 'After-hours emergency. Repaired copper pipe under kitchen.',
  },
  // Scheduled for next week
  {
    title: 'Garbage disposal installation',
    description: 'Install new garbage disposal. Customer upgrading to 3/4 HP unit.',
    type: 'installation',
    status: 'scheduled',
    priority: 'low',
    estimatedValue: 22500, // $225
    customerIndex: 1,
    scheduledDaysFromNow: 5,
    scheduledHour: 13,
  },
  // Lead - commercial
  {
    title: 'Restaurant grease trap service',
    description: 'Quarterly grease trap cleaning and inspection.',
    type: 'maintenance',
    status: 'lead',
    priority: 'normal',
    estimatedValue: 35000, // $350
    customerIndex: 1,
    notes: 'Commercial account. Needs to be scheduled during closed hours.',
  },
];

// Sample Conversations (3)
export const sampleConversations: SampleConversation[] = [
  // AI-handled lead capture
  {
    customerIndex: 0,
    channel: 'sms',
    status: 'open',
    aiHandled: true,
    messages: [
      {
        content: 'Hi, I found your number on Google. My kitchen faucet is leaking pretty bad. Can someone come look at it?',
        direction: 'inbound',
        senderType: 'customer',
        minutesAgo: 45,
      },
      {
        content: "Hi Sarah! Thanks for reaching out to Mike's Plumbing. I'm sorry to hear about your faucet leak. I'd be happy to help get that fixed for you. Are you available this week for us to come take a look?",
        direction: 'outbound',
        senderType: 'ai',
        minutesAgo: 44,
      },
      {
        content: 'Yes, I can do tomorrow afternoon or Wednesday morning.',
        direction: 'inbound',
        senderType: 'customer',
        minutesAgo: 42,
      },
      {
        content: "Perfect! Let me check our schedule. I'll have Mike reach out shortly to confirm a time that works. In the meantime, can you tell me if the leak is a steady drip or more of a spray?",
        direction: 'outbound',
        senderType: 'ai',
        minutesAgo: 41,
      },
      {
        content: "It's a steady drip from the base of the faucet. Maybe every few seconds.",
        direction: 'inbound',
        senderType: 'customer',
        minutesAgo: 38,
      },
    ],
  },
  // Follow-up after job completion
  {
    customerIndex: 4,
    channel: 'sms',
    status: 'resolved',
    aiHandled: false,
    messages: [
      {
        content: "Hi Lisa! This is Mike from Mike's Plumbing. Just wanted to follow up on yesterday's inspection. Everything looked great! I noticed your water heater is about 7 years old - you might want to consider flushing it annually to extend its life.",
        direction: 'outbound',
        senderType: 'user',
        minutesAgo: 180,
      },
      {
        content: 'Thank you so much Mike! Everything went smoothly. How often should I have the heater checked?',
        direction: 'inbound',
        senderType: 'customer',
        minutesAgo: 165,
      },
      {
        content: "I recommend an annual inspection along with a flush. We can set up a reminder for next year if you'd like. Also, if you have a moment, we'd really appreciate a Google review!",
        direction: 'outbound',
        senderType: 'user',
        minutesAgo: 160,
      },
      {
        content: "Absolutely! You guys were great. I'll leave a review today.",
        direction: 'inbound',
        senderType: 'customer',
        minutesAgo: 155,
      },
    ],
  },
  // Missed call text-back
  {
    customerIndex: 2,
    channel: 'sms',
    status: 'open',
    aiHandled: true,
    messages: [
      {
        content: "Hi! Sorry we missed your call. This is Mike's Plumbing. How can we help you today?",
        direction: 'outbound',
        senderType: 'ai',
        minutesAgo: 120,
      },
      {
        content: 'My bathroom sink is draining really slowly. Its been getting worse over the past few days.',
        direction: 'inbound',
        senderType: 'customer',
        minutesAgo: 115,
      },
      {
        content: "Thanks for letting us know, Emily! A slow drain usually indicates a clog that's building up. We can definitely help with that. What's a good time for us to come take a look? We have availability today at 2 PM or tomorrow morning.",
        direction: 'outbound',
        senderType: 'ai',
        minutesAgo: 114,
      },
      {
        content: 'Today at 2 works!',
        direction: 'inbound',
        senderType: 'customer',
        minutesAgo: 110,
      },
      {
        content: "Great! I've got you down for 2 PM today. Mike will be there. Is 789 Pine Lane still your address? And will you be there to let him in?",
        direction: 'outbound',
        senderType: 'ai',
        minutesAgo: 109,
      },
      {
        content: 'Yes thats the address. I work from home so I will be here.',
        direction: 'inbound',
        senderType: 'customer',
        minutesAgo: 105,
      },
    ],
  },
];

// Sample Reviews (4)
export const sampleReviews: SampleReview[] = [
  {
    platform: 'google',
    rating: 5,
    content: "Mike was fantastic! He fixed our burst pipe in the middle of the night and didn't overcharge us. True professional. Highly recommend!",
    reviewerName: 'Sarah J.',
    daysAgo: 3,
    responded: true,
    response: "Thank you so much Sarah! We're glad we could help during that stressful situation. We appreciate your trust in us!",
  },
  {
    platform: 'google',
    rating: 5,
    content: 'Just had my annual inspection done. Very thorough and Mike took the time to explain everything. Fair prices too.',
    reviewerName: 'Lisa M.',
    daysAgo: 1,
    responded: false,
  },
  {
    platform: 'yelp',
    rating: 4,
    content: 'Good service, arrived on time. Fixed the toilet quickly. Only 4 stars because the quoted price went up slightly after they saw the work needed.',
    reviewerName: 'David T.',
    daysAgo: 7,
    responded: true,
    response: "Thanks for the feedback David! We always try to give accurate estimates, but sometimes we find additional issues once we start the work. We'll make sure to communicate better about potential price changes upfront.",
  },
  {
    platform: 'google',
    rating: 5,
    content: "Best plumber in Austin! Mike's team installed our new water heater same day. Clean, professional, and the price was exactly as quoted.",
    reviewerName: 'Michael C.',
    daysAgo: 14,
    responded: true,
    response: 'Thank you Michael! We really appreciate the kind words. Enjoy that new water heater!',
  },
];

/**
 * Helper to generate relative dates
 */
export function getRelativeDate(daysFromNow: number, hour?: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  if (hour !== undefined) {
    date.setHours(hour, 0, 0, 0);
  }
  return date;
}

/**
 * Helper to generate relative time (for messages)
 */
export function getRelativeTime(minutesAgo: number): Date {
  const date = new Date();
  date.setMinutes(date.getMinutes() - minutesAgo);
  return date;
}
