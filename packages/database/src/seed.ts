import { PrismaClient, SubscriptionTier, UserRole, CustomerSource, JobType, JobStatus, JobPriority, MessageTemplateType, TemplateChannel } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ============================================
  // SYSTEM MESSAGE TEMPLATES (no organizationId)
  // ============================================
  console.log('📝 Creating default message templates...');

  const templates = [
    {
      type: MessageTemplateType.missed_call_textback,
      name: 'Missed Call Text-Back (Business Hours)',
      content: `Hi! This is {{businessName}}. Sorry we missed your call - we're currently helping another customer. Reply here or call back and we'll get you taken care of ASAP. What can we help with today?`,
    },
    {
      type: MessageTemplateType.missed_call_after_hours,
      name: 'Missed Call Text-Back (After Hours)',
      content: `Hi! This is {{businessName}}. We're closed for the day but wanted to let you know we got your call. We'll reach out first thing tomorrow, or reply here with details and we'll be ready to help.`,
    },
    {
      type: MessageTemplateType.review_request,
      name: 'Review Request - Initial',
      content: `Thanks for choosing {{businessName}}, {{customerName}}! We'd love your feedback - it only takes 30 seconds: {{reviewLink}}`,
    },
    {
      type: MessageTemplateType.review_request_followup,
      name: 'Review Request - Follow Up',
      content: `Hi {{customerName}}, quick reminder from {{businessName}} - we'd really appreciate a review if you have a moment: {{reviewLink}}`,
    },
    {
      type: MessageTemplateType.review_sentiment_check,
      name: 'Review Request - Low Sentiment',
      content: `We're sorry to hear that, {{customerName}}. What could we have done better? Your feedback helps us improve. Reply here or call us.`,
    },
    {
      type: MessageTemplateType.estimate_sent,
      name: 'Estimate Sent',
      content: `Hi {{customerName}}, here's your estimate for {{jobTitle}}: {{estimateLink}} - Let us know if you have any questions!`,
    },
    {
      type: MessageTemplateType.estimate_followup,
      name: 'Estimate Follow-Up Day 1',
      content: `Hi {{customerName}}, just checking in - did you have a chance to review the estimate we sent? Let us know if you have any questions!`,
    },
    {
      type: MessageTemplateType.estimate_expiring,
      name: 'Estimate Expiring',
      content: `Last reminder about your estimate from {{businessName}}. It expires soon - let us know if you'd like to move forward!`,
    },
    {
      type: MessageTemplateType.appointment_confirmation,
      name: 'Appointment Confirmation',
      content: `Your appointment with {{businessName}} is confirmed for {{date}} at {{time}}. Reply C to confirm or R to reschedule.`,
    },
    {
      type: MessageTemplateType.appointment_reminder,
      name: 'Appointment Reminder',
      content: `Reminder: You have an appointment with {{businessName}} tomorrow at {{time}}. We'll text when we're on our way!`,
    },
    {
      type: MessageTemplateType.appointment_on_my_way,
      name: 'On My Way',
      content: `{{technicianName}} from {{businessName}} is on the way! ETA: {{eta}}.`,
    },
    {
      type: MessageTemplateType.invoice_sent,
      name: 'Invoice Sent',
      content: `Hi {{customerName}}, thanks for choosing {{businessName}}! Here's your invoice: {{invoiceLink}}`,
    },
    {
      type: MessageTemplateType.invoice_reminder,
      name: 'Invoice Reminder',
      content: `Hi {{customerName}}, friendly reminder that your invoice from {{businessName}} is due. Pay securely here: {{paymentLink}}`,
    },
    {
      type: MessageTemplateType.invoice_overdue,
      name: 'Invoice Overdue',
      content: `Your invoice from {{businessName}} is now overdue. Please complete payment to avoid late fees: {{paymentLink}}`,
    },
    {
      type: MessageTemplateType.payment_received,
      name: 'Payment Received',
      content: `Payment received! Thank you for your business. - {{businessName}}`,
    },
    {
      type: MessageTemplateType.maintenance_reminder,
      name: 'Maintenance Reminder',
      content: `Hi {{customerName}}! It's been {{months}} months since we serviced your {{equipmentType}}. Time for a check-up? Reply to schedule.`,
    },
    {
      type: MessageTemplateType.referral_request,
      name: 'Referral Request',
      content: `Thanks again for choosing {{businessName}}! Know someone who needs a plumber? Share this link and you'll both get $25 off: {{referralLink}}`,
    },
  ];

  for (const template of templates) {
    // For system templates (no org), we can't use upsert with null in unique constraint
    // So we check if it exists first, then create or update
    const existing = await prisma.messageTemplate.findFirst({
      where: {
        organizationId: null,
        type: template.type,
        isDefault: true,
      },
    });

    if (existing) {
      await prisma.messageTemplate.update({
        where: { id: existing.id },
        data: {
          content: template.content,
          name: template.name,
        },
      });
    } else {
      await prisma.messageTemplate.create({
        data: {
          organizationId: null,
          type: template.type,
          name: template.name,
          content: template.content,
          channel: TemplateChannel.sms,
          isDefault: true,
          isActive: true,
        },
      });
    }
  }

  console.log(`✅ Created ${templates.length} message templates`);

  // Create demo organization
  const org = await prisma.organization.upsert({
    where: { slug: 'mikes-plumbing' },
    update: {},
    create: {
      name: "Mike's Plumbing",
      slug: 'mikes-plumbing',
      phone: '+15165551234',
      email: 'mike@mikesplumbing.com',
      timezone: 'America/New_York',
      subscriptionTier: SubscriptionTier.growth,
      settings: {
        businessHours: {
          monday: { open: '08:00', close: '18:00' },
          tuesday: { open: '08:00', close: '18:00' },
          wednesday: { open: '08:00', close: '18:00' },
          thursday: { open: '08:00', close: '18:00' },
          friday: { open: '08:00', close: '18:00' },
          saturday: { open: '09:00', close: '14:00' },
          sunday: null,
        },
        serviceArea: {
          zipCodes: ['11030', '11020', '11021', '11024', '11050', '11576', '11577'],
          cities: ['Manhasset', 'Great Neck', 'Port Washington', 'Roslyn'],
        },
        aiSettings: {
          voiceEnabled: true,
          textEnabled: true,
          greeting: "Thanks for calling Mike's Plumbing! How can I help you today?",
          escalationKeywords: ['emergency', 'flooding', 'manager', 'speak to someone'],
          quietHoursStart: '21:00',
          quietHoursEnd: '07:00',
        },
        reviewSettings: {
          enabled: true,
          delayMinutes: 120, // 2 hours after job completion
          sendReminder: true,
          googleReviewUrl: 'https://g.page/r/mikes-plumbing/review',
        },
      },
    },
  });

  console.log(`✅ Created organization: ${org.name}`);

  // Create demo user (owner)
  const owner = await prisma.user.upsert({
    where: { clerkId: 'demo_owner_001' },
    update: {},
    create: {
      organizationId: org.id,
      clerkId: 'demo_owner_001',
      email: 'mike@mikesplumbing.com',
      firstName: 'Mike',
      lastName: 'Thompson',
      phone: '+15165551234',
      role: UserRole.owner,
    },
  });

  console.log(`✅ Created user: ${owner.firstName} ${owner.lastName}`);

  // Create phone number for organization
  const phoneNumber = await prisma.phoneNumber.upsert({
    where: { number: '+15165551234' },
    update: {},
    create: {
      organizationId: org.id,
      number: '+15165551234',
      twilioSid: 'PN_DEMO_' + org.id.slice(0, 8),
      type: 'main',
      label: 'Main Line',
      isActive: true,
    },
  });

  console.log(`✅ Created phone number: ${phoneNumber.number}`);

  // Create demo customers
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { organizationId_phone: { organizationId: org.id, phone: '+15165559001' } },
      update: {},
      create: {
        organizationId: org.id,
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@email.com',
        phone: '+15165559001',
        address: {
          street: '123 Oak Street',
          city: 'Manhasset',
          state: 'NY',
          zipCode: '11030',
          country: 'US',
        },
        source: CustomerSource.phone_inbound,
        tags: ['residential', 'repeat'],
      },
    }),
    prisma.customer.upsert({
      where: { organizationId_phone: { organizationId: org.id, phone: '+15165559002' } },
      update: {},
      create: {
        organizationId: org.id,
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.j@email.com',
        phone: '+15165559002',
        address: {
          street: '456 Maple Ave',
          city: 'Great Neck',
          state: 'NY',
          zipCode: '11021',
          country: 'US',
        },
        source: CustomerSource.google,
        tags: ['residential'],
      },
    }),
    prisma.customer.upsert({
      where: { organizationId_phone: { organizationId: org.id, phone: '+15165559003' } },
      update: {},
      create: {
        organizationId: org.id,
        firstName: 'Robert',
        lastName: 'Williams',
        phone: '+15165559003',
        address: {
          street: '789 Pine Road',
          city: 'Port Washington',
          state: 'NY',
          zipCode: '11050',
          country: 'US',
        },
        source: CustomerSource.referral,
        tags: ['residential', 'emergency'],
      },
    }),
  ]);

  console.log(`✅ Created ${customers.length} customers`);

  // Create demo jobs
  const jobs = await Promise.all([
    prisma.job.create({
      data: {
        organizationId: org.id,
        customerId: customers[0].id,
        assignedToId: owner.id,
        title: 'Water Heater Replacement',
        description: '50-gallon gas water heater replacement. Current unit is 15 years old and leaking.',
        type: JobType.installation,
        status: JobStatus.scheduled,
        priority: JobPriority.normal,
        scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        estimatedValue: 250000, // $2,500
      },
    }),
    prisma.job.create({
      data: {
        organizationId: org.id,
        customerId: customers[1].id,
        title: 'Bathroom Faucet Repair',
        description: 'Kitchen faucet dripping constantly. Tried tightening but still leaking.',
        type: JobType.repair,
        status: JobStatus.lead,
        priority: JobPriority.low,
        estimatedValue: 15000, // $150
      },
    }),
    prisma.job.create({
      data: {
        organizationId: org.id,
        customerId: customers[2].id,
        assignedToId: owner.id,
        title: 'Emergency Pipe Burst',
        description: 'Pipe burst in basement. Water shut off. Needs immediate attention.',
        type: JobType.emergency,
        status: JobStatus.completed,
        priority: JobPriority.emergency,
        completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        actualValue: 85000, // $850
      },
    }),
  ]);

  console.log(`✅ Created ${jobs.length} jobs`);

  // Create review request sequence
  const reviewSequence = await prisma.sequence.create({
    data: {
      organizationId: org.id,
      name: 'Post-Job Review Request',
      type: 'review_request',
      trigger: { event: 'job.completed' },
      isActive: true,
      steps: [
        {
          id: 'step_1',
          order: 0,
          delayMinutes: 120, // 2 hours after job
          action: 'send_sms',
          template: 'reviewRequest.initial',
        },
        {
          id: 'step_2',
          order: 1,
          delayMinutes: 4320, // 3 days
          action: 'send_sms',
          template: 'reviewRequest.followup',
          conditions: [{ field: 'reviewRequest.status', operator: 'not_equals', value: 'completed' }],
        },
      ],
    },
  });

  console.log(`✅ Created sequence: ${reviewSequence.name}`);

  // Create estimate follow-up sequence
  const estimateSequence = await prisma.sequence.create({
    data: {
      organizationId: org.id,
      name: 'Estimate Follow-up',
      type: 'estimate_followup',
      trigger: { event: 'estimate.sent' },
      isActive: true,
      steps: [
        {
          id: 'step_1',
          order: 0,
          delayMinutes: 1440, // 1 day
          action: 'send_sms',
          template: 'estimateFollowUp.day1',
          conditions: [{ field: 'estimate.status', operator: 'equals', value: 'sent' }],
        },
        {
          id: 'step_2',
          order: 1,
          delayMinutes: 4320, // 3 days
          action: 'send_sms',
          template: 'estimateFollowUp.day3',
          conditions: [{ field: 'estimate.status', operator: 'equals', value: 'sent' }],
        },
        {
          id: 'step_3',
          order: 2,
          delayMinutes: 10080, // 7 days
          action: 'send_sms',
          template: 'estimateFollowUp.day7',
          conditions: [{ field: 'estimate.status', operator: 'equals', value: 'sent' }],
        },
      ],
    },
  });

  console.log(`✅ Created sequence: ${estimateSequence.name}`);

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
