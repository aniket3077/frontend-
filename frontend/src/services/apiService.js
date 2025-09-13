import config from '../config/env.js';

class ApiService {
  constructor() {
    this.baseURL = config.API_BASE_URL;
  }

  // Helper method to make API requests with better error handling
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      ...options
    };

    try {
      console.log(`🌐 Making API request to: ${url}`);
      console.log(`🔧 Request options:`, defaultOptions);

      const response = await fetch(url, defaultOptions);
      
      console.log(`📡 Response status: ${response.status}`);
      console.log(`📡 Response headers:`, [...response.headers.entries()]);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ API response:`, data);
      return data;

    } catch (error) {
      console.error(`❌ API request failed:`, error);
      
      // Provide more specific error messages
      if (error.message.includes('CORS')) {
        throw new Error('Network error: CORS policy blocked the request. Please contact support.');
      } else if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error: Unable to connect to the server. Please check your internet connection.');
      } else {
        throw error;
      }
    }
  }

  // Booking API methods
  async createBooking(bookingData) {
    return this.makeRequest('/api/bookings/create', {
      method: 'POST',
      body: JSON.stringify(bookingData)
    });
  }

  // QR API methods
  async getQRDetails(qrData) {
    return this.makeRequest('/api/qr/details', {
      method: 'POST',
      body: JSON.stringify({ qrData })
    });
  }

  async markQRUsed(qrData) {
    return this.makeRequest('/api/qr/mark-used', {
      method: 'POST',
      body: JSON.stringify({ qrData })
    });
  }

  // Payment API methods
  async createPaymentOrder(orderData) {
    return this.makeRequest('/api/payments/create-order', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  }

  async verifyPayment(paymentData) {
    return this.makeRequest('/api/payments/verify', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  }

  // Health check
  async healthCheck() {
    return this.makeRequest('/api/health');
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;