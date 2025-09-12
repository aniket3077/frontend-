const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

class PaymentService {
  // Load Razorpay script dynamically
  loadRazorpayScript() {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay script'));
      document.head.appendChild(script);
    });
  }

  // Create payment order
  async createPaymentOrder(orderData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to create payment order');
      }

      return data.order;
    } catch (error) {
      console.error('Create payment order error:', error);
      throw error;
    }
  }

  // Verify payment
  async verifyPayment(paymentData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Verify payment error:', error);
      throw error;
    }
  }

  // Get payment status
  async getPaymentStatus(paymentId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/status/${paymentId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get payment status error:', error);
      throw error;
    }
  }

  // Calculate pricing based on pass type and duration
  calculatePricing(passType, passDuration, numTickets) {
    const pricing = {
      daily: {
        female: 399,
        couple: 699,
        kids: 99,
        family: 1300
      },
      season: {
        female: 2499,
        couple: 3499,
        family: 5999
      }
    };

    const prices = pricing[passDuration] || pricing.daily;
    const basePrice = prices[passType] || 0;

    // For couple pass, price is fixed for 2 people
    if (passType === 'couple') {
      return basePrice;
    }

    // For family pass, calculate per member price
    if (passType === 'family') {
      const pricePerMember = basePrice / 4; // Base price is for 4 members
      return Math.round(pricePerMember * numTickets);
    }

    // For other pass types, multiply by number of tickets
    return basePrice * numTickets;
  }

  // Validate payment data
  validatePaymentData(bookingData) {
    const requiredFields = ['id', 'pass_type', 'pass_duration', 'num_tickets', 'total_amount'];
    
    for (const field of requiredFields) {
      if (!bookingData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate pass type
    const validPassTypes = ['female', 'couple', 'kids', 'family'];
    if (!validPassTypes.includes(bookingData.pass_type)) {
      throw new Error(`Invalid pass type: ${bookingData.pass_type}`);
    }

    // Validate pass duration
    const validDurations = ['daily', 'season'];
    if (!validDurations.includes(bookingData.pass_duration)) {
      throw new Error(`Invalid pass duration: ${bookingData.pass_duration}`);
    }

    // Validate ticket quantity
    if (bookingData.num_tickets < 1) {
      throw new Error('Number of tickets must be at least 1');
    }

    // Validate couple pass quantity
    if (bookingData.pass_type === 'couple' && bookingData.num_tickets !== 2) {
      throw new Error('Couple pass must be for exactly 2 people');
    }

    // Validate family pass quantity
    if (bookingData.pass_type === 'family' && (bookingData.num_tickets < 1 || bookingData.num_tickets > 4)) {
      throw new Error('Family pass must be for 1-4 members');
    }

    // Validate amount
    const expectedAmount = this.calculatePricing(
      bookingData.pass_type,
      bookingData.pass_duration,
      bookingData.num_tickets
    );

    if (Math.abs(bookingData.total_amount - expectedAmount) > 1) {
      throw new Error(`Amount mismatch. Expected: ₹${expectedAmount}, Got: ₹${bookingData.total_amount}`);
    }

    return true;
  }

  // Format currency
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  // Get pass type display name
  getPassTypeDisplayName(passType, passDuration) {
    const displayNames = {
      daily: {
        female: 'Female Daily Pass',
        couple: 'Couple Daily Pass',
        kids: 'Kids Daily Pass',
        family: 'Family Daily Pass'
      },
      season: {
        female: 'Female Season Pass',
        couple: 'Couple Season Pass',
        family: 'Family Season Pass'
      }
    };

    return displayNames[passDuration]?.[passType] || `${passType} ${passDuration} pass`;
  }
}

export const paymentService = new PaymentService();
