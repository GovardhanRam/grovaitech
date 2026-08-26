/**
 * Grovaitech AI Platform
 * lib/supabase/mockDbHelper.ts
 *
 * Server-side helper to read/write from a local mock-db.json file.
 * Automatically initializes with seed data if the database doesn't exist.
 */

import fs from 'fs';
import path from 'path';

// Path inside the project workspace
const DB_PATH = path.join(process.cwd(), 'lib', 'supabase', 'mock-db.json');

export interface MockDbSchema {
  users: any[];
  chats: any[];
  messages: any[];
  documents: any[];
  clients: any[];
  clinic_bookings: any[];
  real_estate_leads: any[];
  settings: Record<string, any>;
}

const SEED_DATA: MockDbSchema = {
  users: [
    {
      id: 'mock-admin-id-111',
      email: 'admin@grovaitech.com',
      password: 'password123',
      full_name: 'Govardhan R',
      role: 'Admin',
      created_at: new Date().toISOString()
    }
  ],
  chats: [
    {
      id: 'mock-chat-1',
      user_id: 'mock-admin-id-111',
      title: 'AI Receptionist Setup',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'mock-chat-2',
      user_id: 'mock-admin-id-111',
      title: 'WhatsApp Automation Plan',
      created_at: new Date(Date.now() - 3600000 * 24).toISOString()
    }
  ],
  messages: [
    {
      id: 'msg-1',
      chat_id: 'mock-chat-1',
      role: 'user',
      content: 'Can you help me set up an AI Receptionist for my dental clinic?',
      created_at: new Date(Date.now() - 3600000 * 2 + 60000).toISOString()
    },
    {
      id: 'msg-2',
      chat_id: 'mock-chat-1',
      role: 'assistant',
      content: 'Sure! I can help with that. To start an AI Receptionist for a dental clinic, we will need to:\n1. Hook up a phone number or web chat widget.\n2. Configure booking calendar integration (e.g. Google Calendar, Calendly).\n3. Input FAQs like working hours, service costs, and location.\n\nWould you like me to draft an initial configuration template for your clinic?',
      created_at: new Date(Date.now() - 3600000 * 2 + 120000).toISOString()
    }
  ],
  documents: [
    {
      id: 'doc-1',
      user_id: 'mock-admin-id-111',
      name: 'dental_clinic_faqs.pdf',
      size: 1048576, // 1MB
      type: 'pdf',
      status: 'Ready',
      created_at: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    {
      id: 'doc-2',
      user_id: 'mock-admin-id-111',
      name: 'whatsapp_campaign_policy.docx',
      size: 512000, // 500KB
      type: 'docx',
      status: 'Ready',
      created_at: new Date(Date.now() - 3600000 * 5).toISOString()
    }
  ],
  clients: [
    {
      id: 'client-1',
      name: 'Apollo Dental Clinic',
      email: 'contact@apollodental.in',
      industry: 'Clinics',
      status: 'Active',
      services: ['AI Receptionist', 'WhatsApp AI'],
      created_at: new Date(Date.now() - 3600000 * 100).toISOString()
    },
    {
      id: 'client-2',
      name: 'Reddy Law Chambers',
      email: 'info@reddylaw.com',
      industry: 'Law firms',
      status: 'Onboarding',
      services: ['AI Lead Qualifier', 'Document RAG'],
      created_at: new Date(Date.now() - 3600000 * 48).toISOString()
    },
    {
      id: 'client-3',
      name: 'Vogue Salon & Spa',
      email: 'hello@voguesalon.in',
      industry: 'Salons',
      status: 'Active',
      services: ['AI Receptionist'],
      created_at: new Date(Date.now() - 3600000 * 10).toISOString()
    }
  ],
  clinic_bookings: [
    {
      id: 'booking-1',
      clinic_id: 'mock-admin-id-111',
      patient_name: 'Suresh Kumar',
      patient_phone: '+91 98765 43210',
      patient_email: 'suresh.kumar@gmail.com',
      appointment_date: '2026-08-18',
      appointment_time: '10:00 AM',
      doctor_name: 'Dr. Verma',
      reason: 'Routine dental checkup and teeth cleaning.',
      status: 'confirmed',
      created_at: new Date().toISOString()
    },
    {
      id: 'booking-2',
      clinic_id: 'mock-admin-id-111',
      patient_name: 'Priya Sharma',
      patient_phone: '+91 98765 12345',
      patient_email: 'priya.sharma@outlook.com',
      appointment_date: '2026-08-18',
      appointment_time: '02:30 PM',
      doctor_name: 'Dr. Verma',
      reason: 'Wisdom tooth extraction consultation.',
      status: 'pending',
      created_at: new Date().toISOString()
    },
    {
      id: 'booking-3',
      clinic_id: 'mock-admin-id-111',
      patient_name: 'Rahul Reddy',
      patient_phone: '+91 90000 88888',
      patient_email: 'rahul.reddy@yahoo.com',
      appointment_date: '2026-08-19',
      appointment_time: '11:30 AM',
      doctor_name: 'Dr. Verma',
      reason: 'Root canal therapy session.',
      status: 'pending',
      created_at: new Date().toISOString()
    }
  ],
  real_estate_leads: [],
  settings: {
    theme: 'dark',
    notificationEmail: true,
    notificationSms: false,
    apiKeyGemini: 'configured-local-env',
    apiKeyOllama: 'http://localhost:11434',
    apiKeyN8N: ''
  }
};

export function getMockDb(): MockDbSchema {
  try {
    if (!fs.existsSync(DB_PATH)) {
      // Ensure directory exists
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_PATH, JSON.stringify(SEED_DATA, null, 2), 'utf-8');
      return SEED_DATA;
    }
    const content = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading mock database:', error);
    return SEED_DATA;
  }
}

export function saveMockDb(db: MockDbSchema) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving mock database:', error);
  }
}
