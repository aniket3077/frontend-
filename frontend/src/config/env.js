// Environment configuration
const config = {
  // API Base URL - check multiple sources
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 
                process.env.VITE_API_BASE_URL || 
                'https://mrd2025.netlify.app',
  
  // Razorpay Key
  RAZORPAY_KEY_ID: import.meta.env.VITE_RAZORPAY_KEY_ID || 
                   process.env.VITE_RAZORPAY_KEY_ID || 
                   '',
  
  // Development flags
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
  MODE: import.meta.env.MODE
};

// Debug logging in development
if (config.IS_DEV || window.location.hostname === 'localhost') {
  console.log('🔧 Environment Config:', config);
  console.log('🔧 import.meta.env:', import.meta.env);
}

export default config;