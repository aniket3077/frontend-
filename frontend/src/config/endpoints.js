// Centralized API endpoints and URL builder
import config from './env.js';

// Base backend URL (replace via env or edit here)
export const BACKEND_URL = config.API_BASE_URL;

// Safe URL join to avoid double slashes
const join = (...parts) =>
  parts
    .filter(Boolean)
    .map((p, i) => {
      if (i === 0) return String(p).replace(/\/+$/, '');
      return String(p).replace(/^\/+/, '').replace(/\/+$/, '');
    })
    .join('/');

export const urlFor = (endpointPath) => join(BACKEND_URL, endpointPath);

// Declare endpoint paths only (no base URL here)
export const ENDPOINTS = {
  health: '/api/health',
  bookings: {
    create: '/api/bookings/create',
    addUsers: '/api/bookings/add-users',
    createPayment: '/api/bookings/create-payment',
    confirmPayment: '/api/bookings/confirm-payment',
  },
  payments: {
    createOrder: '/api/payments/create-order',
    verify: '/api/payments/verify',
    status: (paymentId) => `/api/payments/status/${paymentId}`,
  },
  qr: {
    details: '/api/qr/details',
    markUsed: '/api/qr/mark-used',
  },
};

export default ENDPOINTS;
