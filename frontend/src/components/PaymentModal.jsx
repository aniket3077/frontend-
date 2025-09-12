import React, { useState, useEffect } from 'react';
import { paymentService } from '../services/paymentService';

const PaymentModal = ({ 
  isOpen, 
  onClose, 
  bookingData, 
  onPaymentSuccess, 
  onPaymentFailure 
}) => {
  const [paymentStatus, setPaymentStatus] = useState('idle'); // idle, processing, success, failed
  const [paymentError, setPaymentError] = useState('');
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRazorpayScript();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && razorpayLoaded && bookingData) {
      // Automatically trigger payment when modal opens and Razorpay is loaded
      handlePayment();
    }
  }, [isOpen, razorpayLoaded, bookingData]);

  const loadRazorpayScript = async () => {
    try {
      await paymentService.loadRazorpayScript();
      setRazorpayLoaded(true);
    } catch (error) {
      console.error('Failed to load Razorpay script:', error);
      setPaymentError('Failed to load payment system');
    }
  };

  const handlePayment = async () => {
    if (!bookingData) {
      setPaymentError('Booking data is missing');
      return;
    }

    setPaymentStatus('processing');
    setPaymentError('');

    try {
      // Check Razorpay configuration
      const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
      
      // Use test key for development to show actual Razorpay window
      const testKeyId = razorpayKeyId === 'your_razorpay_key_id_here' || razorpayKeyId === 'rzp_live_your_actual_key_id_here' 
        ? 'rzp_test_9WaALlexCKqdNl' // Razorpay test key
        : razorpayKeyId;
      
      if (!testKeyId) {
        console.error('No Razorpay key available');
        setPaymentStatus('failed');
        setPaymentError('Payment system not configured');
        return;
      }

      // Create payment order
      const orderData = await paymentService.createPaymentOrder({
        booking_id: bookingData.id,
        amount: bookingData.total_amount,
        currency: 'INR',
        receipt: `booking_${bookingData.id}_${Date.now()}`
      });

      // Configure Razorpay options
      const options = {
        key: testKeyId,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Malang Raas Dandiya 2025',
        description: `${bookingData.pass_type} Pass - ${bookingData.pass_duration}`,
        order_id: orderData.order.id,
        handler: async (response) => {
          try {
            // Verify payment
            const verificationResult = await paymentService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              booking_id: bookingData.id
            });

            if (verificationResult.success) {
              setPaymentStatus('success');
              onPaymentSuccess({
                ...response,
                booking_id: bookingData.id,
                amount: bookingData.total_amount
              });
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            setPaymentStatus('failed');
            setPaymentError('Payment verification failed');
            onPaymentFailure(error);
          }
        },
        prefill: {
          name: userData?.name || '',
          email: userData?.email || '',
          contact: userData?.phone || ''
        },
        theme: {
          color: '#ec4899'
        },
        modal: {
          ondismiss: function() {
            console.log('Payment cancelled by user');
            setPaymentStatus('failed');
            setPaymentError('Payment was cancelled');
            onPaymentFailure(new Error('Payment cancelled'));
          }
        }
      };

      // Open Razorpay checkout
      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('failed');
      setPaymentError(error.message || 'Payment failed');
      onPaymentFailure(error);
    }
  };

  console.log('🔧 PaymentModal render - isOpen:', isOpen, 'bookingData:', bookingData);
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">
            Complete Payment
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Booking Summary */}
        <div className="bg-gradient-to-r from-pink-50 to-orange-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-gray-800 mb-2">Booking Summary</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Pass Type:</span>
              <span className="capitalize">{bookingData?.pass_type} ({bookingData?.pass_duration})</span>
            </div>
            <div className="flex justify-between">
              <span>Tickets:</span>
              <span>{bookingData?.num_tickets}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{bookingData?.booking_date}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg text-pink-600 pt-2 border-t">
              <span>Total Amount:</span>
              <span>₹{bookingData?.total_amount}</span>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        {paymentStatus === 'idle' && (
          <div className="text-center">
            <p className="text-gray-600 mb-4">Redirecting to payment gateway...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
          </div>
        )}

        {paymentStatus === 'processing' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Processing payment...</p>
          </div>
        )}

        {paymentStatus === 'success' && (
          <div className="text-center">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h3 className="text-xl font-semibold text-green-600 mb-2">Payment Successful!</h3>
            <p className="text-gray-600">Your booking has been confirmed.</p>
          </div>
        )}

        {paymentStatus === 'failed' && (
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">✗</div>
            <h3 className="text-xl font-semibold text-red-600 mb-2">Payment Failed</h3>
            <p className="text-gray-600 mb-4">{paymentError}</p>
            <button
              onClick={handlePayment}
              className="bg-gradient-to-r from-pink-500 to-orange-400 text-white py-2 px-6 rounded-lg font-semibold hover:from-pink-600 hover:to-orange-500 transition-all duration-200"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;
