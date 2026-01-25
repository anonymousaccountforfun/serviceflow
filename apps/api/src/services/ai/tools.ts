/**
 * AI Tool Definitions and Handlers
 * Implements real tool actions for the AI to use
 */

import { prisma } from '@serviceflow/database';
import { logger } from '../../lib/logger';
import { ToolCall, ToolDefinition } from './provider';

// Tool definitions for the AI
export const aiTools: ToolDefinition[] = [
  {
    name: 'check_availability',
    description: 'Check available appointment slots for a given date. Returns a list of available time slots.',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'The date to check availability for, in YYYY-MM-DD format',
        },
      },
      required: ['date'],
    },
  },
  {
    name: 'book_appointment',
    description: 'Book an appointment for a customer. Creates a new appointment in the system.',
    parameters: {
      type: 'object',
      properties: {
        customer_name: {
          type: 'string',
          description: 'The full name of the customer',
        },
        phone: {
          type: 'string',
          description: 'Customer phone number',
        },
        date: {
          type: 'string',
          description: 'Appointment date in YYYY-MM-DD format',
        },
        time: {
          type: 'string',
          description: 'Appointment time in HH:MM format (24-hour)',
        },
        issue_description: {
          type: 'string',
          description: 'Description of the issue or service needed',
        },
        job_type: {
          type: 'string',
          description: 'Type of job/service',
          enum: ['repair', 'installation', 'maintenance', 'inspection', 'emergency', 'other'],
        },
      },
      required: ['customer_name', 'phone', 'date', 'time', 'issue_description'],
    },
  },
  {
    name: 'create_lead',
    description: 'Create a new lead/customer record when someone calls but does not book an appointment.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Customer name',
        },
        phone: {
          type: 'string',
          description: 'Customer phone number',
        },
        issue: {
          type: 'string',
          description: 'Brief description of what they called about',
        },
      },
      required: ['name', 'phone'],
    },
  },
  {
    name: 'transfer_to_human',
    description: 'Transfer the call to a human operator. Use this when the customer explicitly asks to speak to a person, or when the issue is too complex for AI to handle.',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Brief reason for the transfer',
        },
      },
      required: ['reason'],
    },
  },
];

export interface ToolContext {
  organizationId: string;
  callId?: string;
  customerId?: string;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// Tool handler implementations
async function handleCheckAvailability(
  args: { date: string },
  context: ToolContext
): Promise<ToolResult> {
  try {
    const date = new Date(args.date);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get existing appointments for the date
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        organizationId: context.organizationId,
        scheduledAt: {
          gte: date,
          lt: nextDay,
        },
        status: {
          notIn: ['canceled', 'completed'],
        },
      },
      select: {
        scheduledAt: true,
        duration: true,
      },
    });

    // Generate available slots (9 AM to 5 PM, 1-hour slots)
    const busyTimes = new Set(
      existingAppointments.map(apt => apt.scheduledAt.getHours())
    );

    const availableSlots: string[] = [];
    for (let hour = 9; hour < 17; hour++) {
      if (!busyTimes.has(hour)) {
        const timeStr = `${hour.toString().padStart(2, '0')}:00`;
        availableSlots.push(timeStr);
      }
    }

    return {
      success: true,
      data: {
        date: args.date,
        availableSlots,
        message: availableSlots.length > 0
          ? `Available times on ${args.date}: ${availableSlots.join(', ')}`
          : `No availability on ${args.date}. Please try another date.`,
      },
    };
  } catch (error) {
    logger.error('check_availability failed', { error, args, context });
    return {
      success: false,
      error: 'Failed to check availability',
    };
  }
}

async function handleBookAppointment(
  args: {
    customer_name: string;
    phone: string;
    date: string;
    time: string;
    issue_description: string;
    job_type?: string;
  },
  context: ToolContext
): Promise<ToolResult> {
  try {
    // Find or create customer
    let customer = await prisma.customer.findFirst({
      where: {
        organizationId: context.organizationId,
        phone: args.phone,
      },
    });

    if (!customer) {
      const nameParts = args.customer_name.split(' ');
      customer = await prisma.customer.create({
        data: {
          organizationId: context.organizationId,
          firstName: nameParts[0] || args.customer_name,
          lastName: nameParts.slice(1).join(' ') || '',
          phone: args.phone,
          source: 'ai_call',
        },
      });
    }

    // Parse date and time
    const [hours, minutes] = args.time.split(':').map(Number);
    const scheduledAt = new Date(args.date);
    scheduledAt.setHours(hours, minutes, 0, 0);

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        organizationId: context.organizationId,
        customerId: customer.id,
        title: args.issue_description.slice(0, 100),
        description: args.issue_description,
        scheduledAt,
        duration: 60, // Default 1 hour
        status: 'scheduled',
        type: (args.job_type as 'repair' | 'installation' | 'maintenance' | 'inspection' | 'emergency' | 'other') || 'other',
      },
    });

    logger.info('Appointment booked via AI', {
      appointmentId: appointment.id,
      customerId: customer.id,
      organizationId: context.organizationId,
    });

    return {
      success: true,
      data: {
        appointmentId: appointment.id,
        customerId: customer.id,
        scheduledAt: scheduledAt.toISOString(),
        message: `Appointment confirmed for ${args.customer_name} on ${args.date} at ${args.time}. We'll see you then!`,
      },
    };
  } catch (error) {
    logger.error('book_appointment failed', { error, args, context });
    return {
      success: false,
      error: 'Failed to book appointment. Please try again or speak to a representative.',
    };
  }
}

async function handleCreateLead(
  args: { name: string; phone: string; issue?: string },
  context: ToolContext
): Promise<ToolResult> {
  try {
    // Check if customer already exists
    let customer = await prisma.customer.findFirst({
      where: {
        organizationId: context.organizationId,
        phone: args.phone,
      },
    });

    if (!customer) {
      const nameParts = args.name.split(' ');
      customer = await prisma.customer.create({
        data: {
          organizationId: context.organizationId,
          firstName: nameParts[0] || args.name,
          lastName: nameParts.slice(1).join(' ') || '',
          phone: args.phone,
          notes: args.issue ? `Initial inquiry: ${args.issue}` : undefined,
          source: 'ai_call',
        },
      });

      logger.info('Lead created via AI', {
        customerId: customer.id,
        organizationId: context.organizationId,
      });

      return {
        success: true,
        data: {
          customerId: customer.id,
          isNew: true,
          message: 'Contact information saved. We will follow up with you soon.',
        },
      };
    }

    return {
      success: true,
      data: {
        customerId: customer.id,
        isNew: false,
        message: 'We have your information on file. Someone will be in touch.',
      },
    };
  } catch (error) {
    logger.error('create_lead failed', { error, args, context });
    return {
      success: false,
      error: 'Failed to save contact information',
    };
  }
}

async function handleTransferToHuman(
  args: { reason: string },
  context: ToolContext
): Promise<ToolResult> {
  logger.info('Transfer to human requested', {
    reason: args.reason,
    callId: context.callId,
    organizationId: context.organizationId,
  });

  // In a real implementation, this would trigger Twilio/Vapi call transfer
  // For now, we just log and return a message
  return {
    success: true,
    data: {
      transferInitiated: true,
      reason: args.reason,
      message: 'Transferring you to a team member now. Please hold.',
    },
  };
}

// Main tool executor
export async function executeToolCall(
  toolCall: ToolCall,
  context: ToolContext
): Promise<ToolResult> {
  const { name, arguments: args } = toolCall;

  logger.info('Executing tool call', { tool: name, args, context });

  switch (name) {
    case 'check_availability':
      return handleCheckAvailability(args as { date: string }, context);

    case 'book_appointment':
      return handleBookAppointment(
        args as {
          customer_name: string;
          phone: string;
          date: string;
          time: string;
          issue_description: string;
          job_type?: string;
        },
        context
      );

    case 'create_lead':
      return handleCreateLead(
        args as { name: string; phone: string; issue?: string },
        context
      );

    case 'transfer_to_human':
      return handleTransferToHuman(args as { reason: string }, context);

    default:
      logger.warn('Unknown tool called', { tool: name });
      return {
        success: false,
        error: `Unknown tool: ${name}`,
      };
  }
}
