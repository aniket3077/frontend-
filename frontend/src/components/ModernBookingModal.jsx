import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import config from '../config/env.js';
import ENDPOINTS, { urlFor } from '../config/endpoints.js';

const ModernBookingModal = () => {
  // Removed isOpen state, always show booking form
  const [step, setStep] = useState(1);
  const [bookingId, setBookingId] = useState(null);
  const [ticketData, setTicketData] = useState({
    booking_date: "",
    pass_type: "female",
    num_tickets: 1,
  });

  const [userData, setUserData] = useState({ name: "", email: "", phone: "" });
  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const apiBase = config.API_BASE_URL;

  console.log('🔧 Debug: apiBase =', apiBase);
  console.log('🔧 Debug: config =', config);

  // Malang Raas Dandiya 2025 - Updated Pricing Structure
  const [ticketType, setTicketType] = useState('single'); // 'single' or 'season'
  
  const TICKET_PRICING = {
    single: {
      female: { base: 399, bulk_threshold: 6, bulk_price: 300 },
      couple: { base: 699, bulk_threshold: 6, bulk_price: 300 },
      kids: { base: 99, bulk_threshold: 6, bulk_price: 300 },
      family: { base: 1300, bulk_threshold: 6, bulk_price: 300 },
      male: { base: 699, bulk_threshold: 6, bulk_price: 300 }
    },
    season: {
      female: { base: 2499 },
      couple: { base: 3499 },
      family: { base: 5999 }
    }
  };

  const labelMap = {
    single: {
      female: 'Female - ₹399',
      couple: 'Couple - ₹699',
      kids: 'Kids (6-12 yrs) - ₹99',
      family: 'Family (4 members) - ₹1300',
      male: 'Male - ₹699'
    },
    season: {
      female: 'Season Pass - Female (8 Days) - ₹2499',
      couple: 'Season Pass - Couple (8 Days) - ₹3499',
      family: 'Season Pass - Family (4) (8 Days) - ₹5999'
    }
  };

  // Calculate pricing with bulk discount
  const calculatePrice = () => {
    const pricing = TICKET_PRICING[ticketType]?.[ticketData.pass_type];
    if (!pricing) return { unitPrice: 0, totalAmount: 0, discountApplied: false, savings: 0 };
    
    const quantity = Number(ticketData.num_tickets || 1);
    
    // Check if bulk discount applies (only for single day tickets)
    if (ticketType === 'single' && pricing.bulk_threshold && quantity >= pricing.bulk_threshold) {
      return {
        unitPrice: pricing.bulk_price,
        totalAmount: pricing.bulk_price * quantity,
        discountApplied: true,
        savings: (pricing.base - pricing.bulk_price) * quantity,
        originalPrice: pricing.base
      };
    }
    
    return {
      unitPrice: pricing.base,
      totalAmount: pricing.base * quantity,
      discountApplied: false,
      savings: 0
    };
  };

  const priceInfo = calculatePrice();

  const handleTicketSubmit = async () => {

    if (!ticketData.booking_date || !ticketData.num_tickets) {
      alert("Please select date and number of tickets");
      return;
    }
    setLoading(true);
    try {
  const bookingUrl = urlFor(ENDPOINTS.bookings.create);
      console.log('🔧 Debug: Calling booking URL:', bookingUrl);
      const payload = {
        booking_date: ticketData.booking_date,
        num_tickets: ticketData.num_tickets,
        pass_type: ticketData.pass_type,
        ticket_type: ticketType,
      };
      console.log('🔧 Debug: Payload:', payload);

      const res = await axios.post(bookingUrl, payload, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.data.success) {
        setBookingId(res.data.booking.id);
        setStep(2);
      } else {
        alert("Failed to create booking");
      }
    } catch (err) {
      console.error('Booking creation error:', err);
      console.error('Error response:', err.response);
      console.error('Error message:', err.message);
      
      if (err.response?.data?.code === 'NO_DATABASE') {
        alert("Service temporarily unavailable. Database connection required for booking. Please contact support.");
      } else if (err.response?.data?.message) {
        alert(`Error: ${err.response.data.message}`);
      } else if (err.response?.status) {
        alert(`Server error (${err.response.status}): ${err.response.statusText || 'Unknown error'}`);
      } else if (err.code === 'NETWORK_ERROR' || err.message.includes('Network Error')) {
        alert("Network error: Please check your internet connection and ensure the backend server is running on port 5000");
      } else {
        alert(`API error: ${err.message || "couldn't create booking"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUserSubmit = async () => {
    if (!userData.name || !userData.email || !userData.phone) {
      alert("Please fill all user details");
      return;
    }
    // Email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(userData.email)) {
      setEmailError("Please enter a valid email address");
      return;
    } else if (!userData.email.endsWith("@gmail.com")) {
      setEmailError("Only @gmail.com email addresses are allowed");
      return;
    } else {
      setEmailError("");
    }
    if (!/^\d{10}$/.test(userData.phone)) {
      setPhoneError("Phone number must be exactly 10 digits");
      return;
    } else {
      setPhoneError("");
    }
    setLoading(true);
    try {
      const res = await axios.post(urlFor(ENDPOINTS.bookings.addUsers), {
        booking_id: bookingId,
        ...userData,
      }, { headers: { 'Content-Type': 'application/json' } });
      if (res.data.success) {
        setStep(3);
      } else {
        alert("Failed to add user details");
      }
    } catch (err) {
      console.error(err);
      alert("API error: couldn't add user details");
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpay = (src) => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      // Do not send amount; server will compute from booking
      const orderRes = await axios.post(urlFor(ENDPOINTS.bookings.createPayment), {
        booking_id: bookingId,
        userEmail: userData.email,
        userName: userData.name,
      }, { headers: { 'Content-Type': 'application/json' } });

      const { order, emailSent } = orderRes.data;

      // If email was sent directly (bypassing payment), go to confirmation
      if (emailSent) {
        setStep(4);
        return;
      }

      // Otherwise, proceed with Razorpay payment flow
      const ok = await loadRazorpay("https://checkout.razorpay.com/v1/checkout.js");
      if (!ok) return alert("Failed to load Razorpay SDK");

      const options = {
        key: config.RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        name: "Malang Ras Dandiya 2025",
        description: `Booking for ${ticketData.num_tickets} ${labelMap[ticketType][ticketData.pass_type] || ticketData.pass_type}`,

        image: window.location.origin + '/images/dandiya-logo.png',
        prefill: { name: userData.name, email: userData.email, contact: userData.phone },
        handler: async function (response) {
          try {
            const confirmRes = await axios.post(urlFor(ENDPOINTS.bookings.confirmPayment), {
              booking_id: bookingId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }, { headers: { 'Content-Type': 'application/json' } });
            if (confirmRes.data.success) {
              setStep(4);
            } else {
              alert("Payment confirmed but failed at backend");
            }
          } catch (err) {
            console.error(err);
            alert("Error confirming payment");
          }
        },
        theme: { color: "#e11d48" },
      };

      const rzp = new Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      alert("Error creating payment order");
    } finally {
      setLoading(false);
    }
  };

  const resetBooking = () => {
    setStep(1);
    setBookingId(null);
    setTicketData({ booking_date: "", pass_type: "female", num_tickets: 1 });

    setUserData({ name: "", email: "", phone: "" });
    // Removed setIsOpen(false) as isOpen is not defined in this component
  };

  return (
    <div className="max-w-md mx-auto py-4 px-4">
      {/* <div className="rounded-2xl shadow-xl w-full p-6 overflow-y-auto"> */}
        <div className="flex justify-between items-center mb-6">
        {/* <h2 className="text-center text-2xl font-bold mb-4 bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">Book Your Dandiya Pass</h2> */}
        </div>

        {/* Book your ticket */}
        {step === 1 && (
          <div className="bg-gradient-to-br from-pink-50 via-orange-50 to-red-50 min-h-screen px-4 py-6">
            <div className="w-full max-w-xs bg-white rounded-lg shadow p-3 mx-auto border border-gray-100 mt-10">
              {/* Header */}
              <div className="text-center mb-3">
                <div className="inline-flex items-center justify-center w-6 h-6 bg-gradient-to-r from-pink-500 to-orange-400 rounded-full mb-1">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
                  </svg>
                </div>
                <h3 className="text-sm font-bold bg-gradient-to-r from-pink-600 to-orange-500 bg-clip-text text-transparent mb-1">
                  Book Your Ticket
                </h3>
                <p className="text-gray-600 text-xs mb-1">Malang Raas Dandiya 2025 • Sep 24 - Oct 1</p>
                
                {/* Bulk Discount Banner */}
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded p-1 mb-1 shadow">
                  <p className="text-center text-xs font-bold">💰 6+ tickets = ₹300 each!</p>
                </div>
              </div>

              <div className="space-y-2">
                {/* Event Date */}
                <div className="space-y-1">
                  <label className="flex items-center text-gray-800 font-semibold text-xs">
                    <svg className="w-3 h-3 mr-1 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    Event Date
                  </label>
                  <input
                    type="date"
                    value={ticketData.booking_date}
                    onChange={(e) => setTicketData({ ...ticketData, booking_date: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-orange-400 focus:border-orange-400 focus:outline-none text-gray-700 text-xs"
                  />
                </div>

                {/* Ticket Duration */}
                <div className="space-y-1">
                  <label className="flex items-center text-gray-800 font-semibold text-xs">
                    <svg className="w-3 h-3 mr-1 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Ticket Duration
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setTicketType('single');
                        setTicketData({ ...ticketData, pass_type: 'female' });
                      }}
                      className={`w-full rounded-lg transition-colors duration-150 min-h-[52px] px-4 py-3 border text-center ${
                        ticketType === 'single'
                          ? 'bg-pink-50 text-pink-700 border-pink-300'
                          : 'bg-white text-gray-800 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div>
                        <div className={`font-semibold ${ticketType === 'single' ? 'text-pink-800' : 'text-gray-800'} text-sm`}>Single Day</div>
                        <div className={`${ticketType === 'single' ? 'text-pink-700/80' : 'text-gray-500'} text-xs`}>One event day</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTicketType('season');
                        setTicketData({ ...ticketData, pass_type: 'female' });
                      }}
                      className={`w-full rounded-lg transition-colors duration-150 min-h-[52px] px-4 py-3 border text-center ${
                        ticketType === 'season'
                          ? 'bg-pink-50 text-pink-700 border-pink-300'
                          : 'bg-white text-gray-800 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div>
                        <div className={`font-semibold ${ticketType === 'season' ? 'text-pink-800' : 'text-gray-800'} text-sm`}>Season Pass</div>
                        <div className={`${ticketType === 'season' ? 'text-pink-700/80' : 'text-gray-500'} text-xs`}>All 8 days</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Pass Type */}
                <div className="space-y-2">
                  <label className="flex items-center text-gray-800 font-semibold text-sm">
                    <svg className="w-4 h-4 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                    Pass Type
                  </label>
                  <div className="relative">
                    <select
                      value={ticketData.pass_type}
                      onChange={(e) => setTicketData({ ...ticketData, pass_type: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-orange-400 focus:border-orange-400 focus:outline-none text-gray-700 text-xs appearance-none bg-white"
                    >
                      {Object.entries(labelMap[ticketType]).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Number of Tickets */}
                <div className="space-y-2">
                  <label className="flex items-center text-gray-800 font-semibold text-sm">
                    <svg className="w-4 h-4 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                    </svg>
                    Number of Tickets
                  </label>
                  <div className="flex items-center justify-center bg-gray-50 rounded-xl p-3">
                    <button
                      type="button"
                      onClick={() => setTicketData({ ...ticketData, num_tickets: Math.max(1, ticketData.num_tickets - 1) })}
                      className="w-10 h-10 sm:w-10 sm:h-10 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-150 flex items-center justify-center touch-manipulation"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"/>
                      </svg>
                    </button>
                    <div className="mx-5 sm:mx-6 text-center">
                      <div className="text-xl sm:text-2xl font-bold text-gray-800">{ticketData.num_tickets}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {ticketData.num_tickets === 1 ? 'ticket' : 'tickets'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTicketData({ ...ticketData, num_tickets: ticketData.num_tickets + 1 })}
                      className="w-10 h-10 sm:w-10 sm:h-10 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-150 flex items-center justify-center touch-manipulation"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                      </svg>
                    </button>
                  </div>
                  
                  {/* Bulk Discount Alert */}
                  {priceInfo.discountApplied && (
                    <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-xl p-4 shadow-lg animate-pulse">
                      <div className="flex items-center justify-center">
                        <svg className="w-6 h-6 text-white mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <div className="text-center">
                          <div className="font-bold text-lg">🎊 BULK DISCOUNT ACTIVATED!</div>
                          <div className="text-sm opacity-95 font-semibold">You're saving ₹{priceInfo.savings} with this offer!</div>
                          <div className="text-xs opacity-90 mt-1">Each ticket now costs only ₹{priceInfo.unitPrice}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Discount Hint for users with less than 6 tickets */}
                  {!priceInfo.discountApplied && ticketData.num_tickets < 6 && ticketData.num_tickets >= 3 && (
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-xl p-3 shadow-md">
                      <div className="flex items-center justify-center">
                        <svg className="w-5 h-5 text-white mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <div className="text-center">
                          <div className="font-bold text-sm">💡 Almost there!</div>
                          <div className="text-xs opacity-90">Add {6 - ticketData.num_tickets} more tickets to unlock ₹300/ticket offer</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Price Preview */}
                <div className="bg-gradient-to-r from-pink-50 to-orange-50 rounded-lg p-3 border border-pink-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-gray-600 text-sm">Total Amount</div>
                      {priceInfo.discountApplied && (
                        <div className="text-gray-400 text-xs line-through">₹{priceInfo.originalPrice * ticketData.num_tickets}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-800">₹{priceInfo.totalAmount}</div>
                      {priceInfo.discountApplied && (
                        <div className="text-green-600 text-xs font-semibold">₹{priceInfo.unitPrice} per ticket</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Button */}
              <div className="mt-5 sm:mt-6">
                <button
                  onClick={handleTicketSubmit}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-pink-500 to-orange-400 text-white py-3 sm:py-3 rounded-lg font-bold text-base sm:text-base shadow-md hover:from-pink-600 hover:to-orange-500 hover:shadow-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Processing...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      Continue to Details
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                      </svg>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}


        {/* personal details */}
        {step === 2 && (
          <div className="bg-gradient-to-br from-pink-50 via-orange-50 to-red-50 min-h-screen px-4 py-8">
            <div className="w-full max-w-xs bg-white rounded-lg shadow p-3 mx-auto border border-gray-100 mt-16">
              {/* Header */}
              <div className="text-center mb-2">
                <div className="inline-flex items-center justify-center w-6 h-6 bg-gradient-to-r from-pink-500 to-orange-400 rounded-full mb-1">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
                <h3 className="text-xs font-bold bg-gradient-to-r from-pink-600 to-orange-500 bg-clip-text text-transparent mb-0.5">
                  Personal Details
                </h3>
                <p className="text-gray-600 text-[10px]">We'll send your tickets to these details</p>
              </div>

              <div className="space-y-2">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="flex items-center text-gray-800 font-semibold text-xs">
                    <svg className="w-3 h-3 mr-1 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={userData.name}
                    onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                    placeholder="Enter your full name"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-400 focus:border-orange-400 focus:outline-none text-gray-700 text-sm bg-white"
                    style={{ WebkitBoxShadow: '0 0 0px 1000px #ffffff inset', WebkitTextFillColor: '#111827' }}
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="flex items-center text-gray-800 font-semibold text-xs">
                    <svg className="w-3 h-3 mr-1 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={userData.email}
                    onChange={e => {
                      setUserData({ ...userData, email: e.target.value });
                      setEmailError("");
                    }}
                    placeholder="your.email@example.com"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-orange-400 focus:outline-none transition-all duration-150 text-gray-700 text-sm bg-white ${
                      emailError ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-orange-400'
                    }`}
                    style={{ WebkitBoxShadow: '0 0 0px 1000px #ffffff inset', WebkitTextFillColor: '#111827' }}
                  />
                  {emailError && (
                    <div className="flex items-center text-red-500 text-xs mt-1">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      {emailError}
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="flex items-center text-gray-800 font-semibold text-xs">
                    <svg className="w-3 h-3 mr-1 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                    </svg>
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 text-xs">+91</span>
                    </div>
                    <input
                      type="tel"
                      value={userData.phone}
                      maxLength={10}
                      pattern="[0-9]{10}"
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        setUserData({ ...userData, phone: val });
                        if (val.length === 10) {
                          setPhoneError("");
                        }
                      }}
                      placeholder=""
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-1 focus:ring-orange-400 focus:outline-none transition-all duration-150 text-gray-700 text-sm bg-white ${
                        phoneError ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-orange-400'
                      }`}
                      style={{ WebkitBoxShadow: '0 0 0px 1000px #ffffff inset', WebkitTextFillColor: '#111827' }}
                    />
                  </div>
                  {phoneError && (
                    <div className="flex items-center text-red-500 text-xs mt-1">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      {phoneError}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    We'll send booking confirmation via WhatsApp
                  </div>
                </div>

                {/* Privacy Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <svg className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <div className="text-blue-800 text-[11px]">
                      <div className="font-semibold mb-1 text-xs">Your information is secure</div>
                      <div>We'll only use these details to send your tickets and event updates. No spam, guaranteed!</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-md bg-white hover:bg-gray-50 hover:border-gray-300 font-medium text-sm transition-all duration-150 flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16l-4-4m0 0l4-4m-4 4h18"/>
                  </svg>
                  Back
                </button>
                <button
                  onClick={handleUserSubmit}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-orange-400 text-white py-2 rounded-md font-semibold text-sm shadow-md hover:from-pink-600 hover:to-orange-500 hover:shadow-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Processing...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      Continue to Payment
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                      </svg>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Order Summary */}
        {step === 3 && (
          <div className="flex flex-col items-center justify-center">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 mx-auto">
             
              <h3 className="text-lg text-center  font-bold mb-2 text-gray-800">Order Summary</h3>
              <div className="bg-blue-50 rounded-xl p-5 mb-4">
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                  <div className="text-gray-600 font-medium">Event:</div>
                  <div className="text-right font-semibold text-gray-800">Malang Ras Dandiya 2025</div>
                  <div className="text-gray-600 font-medium">Date:</div>
                  <div className="text-right font-semibold text-gray-800">{ticketData.booking_date}</div>
                  <div className="text-gray-600 font-medium">Pass Type:</div>
                  <div className="text-right font-semibold text-gray-800">{labelMap[ticketType][ticketData.pass_type] || ticketData.pass_type}</div>

                  <div className="text-gray-600 font-medium">Tickets:</div>
                  <div className="text-right font-semibold text-gray-800">{ticketData.num_tickets}</div>
                  <div className="text-gray-600 font-medium">Price per ticket:</div>
                  <div className="text-right font-semibold text-gray-800">
                    {priceInfo.discountApplied ? (
                      <span>
                        <span className="line-through text-gray-500">₹{priceInfo.originalPrice}</span>{' '}
                        <span className="text-green-600 font-bold">₹{priceInfo.unitPrice}</span>
                      </span>
                    ) : (
                      `₹${priceInfo.unitPrice}`
                    )}
                  </div>

                  {priceInfo.discountApplied && (
                    <>
                      <div className="text-green-600 font-medium">Bulk Discount:</div>
                      <div className="text-right font-semibold text-green-600">-₹{priceInfo.savings}</div>
                    </>
                  )}

                  <div className="col-span-2 border-t border-gray-200 my-2"></div>
                  <div className="text-lg font-bold text-gray-700">Total:</div>
                  <div className="text-lg font-extrabold text-right text-gray-900">₹{priceInfo.totalAmount}</div>

                </div>
              </div>
              <div className="mb-4">
                <h5 className="font-semibold text-gray-700 mb-1">Contact Details:</h5>
                <div className="text-sm text-gray-700">
                  <div>{userData.name}</div>
                  <div>{userData.phone}</div>
                  <div>{userData.email}</div>
                </div>
              </div>
              <div className="flex gap-4 mt-2">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg bg-white hover:bg-gray-100 font-semibold transition"
                >
                  Back
                </button>
                <button
                  onClick={handlePayment}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-orange-400 text-white py-2 rounded-lg font-semibold shadow-md hover:from-pink-600 hover:to-orange-500 transition duration-300"
                >
                  {loading ? "Processing..." : `Pay Now`}
                </button>
              </div>
            </div>
          </div>
        )}


        {/* booking confirmation */}
          {/* {step === 4 && (
<div className="text-center space-y-6">
<div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
<span className="text-3xl">✅</span>
</div>
<h2 className="text-2xl font-bold text-green-600">Booking Confirmed!</h2>
<p className="text-gray-600">Your tickets have been sent to your email.</p>
<button onClick={resetBooking} className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-6 rounded-lg hover:from-orange-600 hover:to-red-600 transition duration-300" >
Book Again
</button>
</div>
)} */}

        {step === 4 && (
          <div className="flex flex-col items-center justify-center py-4">
            <div className="flex flex-col items-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="#bbf7d0"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12l2.5 2.5L16 9"/></svg>
              </div>
              <h2 className="text-xl font-bold text-green-600 mb-1 flex items-center gap-2">Booking Confirmed! <span>🎉</span></h2>
              <p className="text-green-700 text-sm mb-2">Your tickets have been sent to your email!</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
              {/* Booking Details */}
              <div className="bg-white rounded-lg shadow p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-gray-800">Booking Details</span>
                  <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded">Conf</span>
                </div>
                <div className="text-xs text-gray-700 space-y-1">
                  <div><span className="font-medium">Booking ID:</span> <span className="font-mono">NF{bookingId || '35'}</span></div>
                  <div><span className="font-medium">Payment Status:</span> <span className="text-green-600 font-semibold">Paid</span></div>
                  <div><span className="font-medium">Total Amount:</span> <span className="text-pink-600 font-bold">₹{priceInfo.totalAmount}</span></div>
                </div>
              </div>
              {/* Your Tickets */}
              <div className="bg-white rounded-lg shadow p-3">
                <span className="font-bold text-sm text-gray-800 block mb-2">Your Tickets</span>
                <div className="space-y-1">
                  <div className="flex items-center justify-between bg-pink-50 rounded px-2 py-1">
                    <span className="font-medium text-gray-700 text-xs">{labelMap[ticketType][ticketData.pass_type] || ticketData.pass_type}</span>
                    <span className="bg-pink-100 text-pink-600 text-xs font-semibold px-2 py-1 rounded">₹{priceInfo.finalPrice} each</span>
                  </div>
                  <div className="flex items-center justify-between bg-pink-50 rounded px-2 py-1">
                    <span className="font-medium text-gray-700 text-xs">Tickets</span>
                    <span className="bg-pink-100 text-pink-600 text-xs font-semibold px-2 py-1 rounded">{ticketData.num_tickets}</span>
                  </div>
                </div>
              </div>
              {/* Customer Info */}
              <div className="bg-white rounded-lg shadow p-3">
                <span className="font-bold text-sm text-gray-800 block mb-2">Customer Information</span>
                <div className="text-xs text-gray-700 space-y-1">
                  <div className="flex items-center gap-2"><span className="bg-pink-100 text-pink-600 rounded-full px-1 py-0.5 font-bold text-xs">👤</span> {userData.name}</div>
                  <div className="flex items-center gap-2"><span className="text-gray-400">📧</span> {userData.email}</div>
                  <div className="flex items-center gap-2"><span className="text-gray-400">📱</span> {userData.phone}</div>
                </div>
              </div>
              {/* Event Info */}
              <div className="bg-white rounded-lg shadow p-3">
                <span className="font-bold text-sm text-gray-800 block mb-2">Event Information</span>
                <div className="text-xs text-gray-700 space-y-1">
                  <div className="flex items-center gap-2"><span className="text-purple-400">📅</span> 4 August 2025</div>
                  <div className="flex items-center gap-2"><span className="text-orange-400">🕰️</span> 7:00 PM onwards</div>
                  <div className="flex items-center gap-2"><span className="text-green-400">📍</span> Mumbai, Maharashtra</div>
                </div>
              </div>
            </div>
            {/* Important Notes - Compact */}
            <div className="w-full max-w-2xl mt-4">
              <div className="bg-blue-50 rounded-lg shadow p-3">
                <span className="font-bold text-sm text-blue-700 block mb-2">Important</span>
                <ul className="text-xs text-blue-900 space-y-1">
                  <li>• Carry valid photo ID and e-ticket</li>
                  <li>• Gates open at 4:30 PM</li>
                  <li>• Check email for details</li>
                </ul>
              </div>
            </div>
            <button onClick={resetBooking} className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-2 px-4 rounded-lg hover:from-orange-600 hover:to-red-600 transition duration-300 text-sm mt-3">
Book Again
</button>
          </div>
        )}



      {/* </div> */}
    </div>
  );
};

export default ModernBookingModal;