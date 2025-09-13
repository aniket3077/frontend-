# Dandiya Ticket Booking

A vibrant landing page for booking Dandiya event tickets, built with React.js (Vite) and TailwindCSS.
Prerequisites

Node.js (v18 or higher)
npm or yarn

Installation

Clone the repository:
git clone YOUR_REPOSITORY_URL
cd dandiya-ticket-booking


Install dependencies:
npm install


Run the development server:
npm run dev


Open [http://localhost:5173](http://localhost:5173) in your browser.


Build
To build for production:
npm run build

Folder Structure

public/: Static assets like images and favicon.
src/: Source code.
assets/: Logo and other assets.
components/: Reusable React components.
App.jsx: Main app component.
index.css: Global styles with TailwindCSS.
main.jsx: Entry point.


tailwind.config.js: TailwindCSS configuration.
vite.config.js: Vite configuration.

Notes

Replace placeholder images in public/images/ with actual Dandiya event images.
The booking form submits with a simple alert; integrate with a backend API for real functionality.

Backend URL configuration

- Set your backend base URL via the Vite env var `VITE_API_BASE_URL`.
  - Locally, create a `.env` file in `frontend/` with: `VITE_API_BASE_URL=http://localhost:5000`
  - In production, set the env in your hosting provider (e.g., Netlify `VITE_API_BASE_URL`).
- All API endpoints are centralized in `src/config/endpoints.js`.
  - You can replace only the base URL and keep paths intact.
  - Use `urlFor(ENDPOINTS.*)` to construct a full URL if adding new calls.
