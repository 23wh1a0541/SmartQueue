# SmartQueue

SmartQueue is a professional virtual queue management system for customers and shop owners. Customers can join a queue digitally, monitor live queue movement, and cancel active tokens. Shop owners can create a shop, manage the live queue, call the next token, mark customers as served or skipped, and track daily analytics.

## Tech Stack

- Backend: Node.js, Express, MongoDB, Mongoose, JWT authentication
- Frontend: React, Vite, modern responsive CSS

## Project Structure

- `backend/` REST API and MongoDB models
- `frontend/` React web app

## Features

- Role-based authentication for customers and shop owners
- Shop creation and open/closed queue controls
- Digital token generation with readable token labels
- Live queue board with current and next token
- Customer token history and cancellation
- Shop owner dashboard for queue operations
- Daily queue analytics

## How To Run

### 1. Backend setup

1. Go to `backend/`
2. Create `.env` from `.env.example`
3. Install dependencies with `npm install`
4. Start the API with `npm run dev`

Example backend `.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/smartqueue
JWT_SECRET=replace_with_a_secure_secret
CLIENT_URL=http://localhost:5173
```

### 2. Frontend setup

1. Go to `frontend/`
2. Create `.env` from `.env.example`
3. Install dependencies with `npm install`
4. Start the app with `npm run dev`

Example frontend `.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Open the app

- Frontend: `http://localhost:5173`
- Backend health check: `http://localhost:5000/api/health`

## Suggested Demo Flow

1. Register a shop owner account
2. Create a shop from the owner dashboard
3. Register a customer account in another browser or incognito window
4. Join the queue as a customer
5. Call the next token from the owner dashboard
6. Mark the called token as served or skipped

## Notes

- The backend expects MongoDB to be running locally unless you replace `MONGO_URI`
- Notifications are currently represented by queue status and `notificationSent`; real SMS/email integration can be added later
