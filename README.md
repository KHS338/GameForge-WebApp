# GameForge - MERN Stack Indie Game Marketplace

A full-stack web application for buying and selling indie games built with React, Express, MongoDB, and Node.js.

## Project Structure

```
GameForge-WebApp/
├── frontend (React + Vite + TypeScript)
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.local
└── backend (Express + MongoDB)
    ├── src/
    ├── models/
    ├── routes/
    ├── package.json
    └── .env
```

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas connection)

### Backend Setup

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your MongoDB connection string:

   **For MongoDB Atlas (recommended for deployment):**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a cluster and database user
   - Copy your connection string: `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/gameforge?retryWrites=true&w=majority`
   - Replace `<username>`, `<password>`, and `<cluster>` with your actual values
   - Add to `.env`:
     ```
     MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/gameforge?retryWrites=true&w=majority
     PORT=5000
     CORS_ORIGIN=http://localhost:5173
     NODE_ENV=development
     ```

   **For Local MongoDB (development only):**
   - Ensure MongoDB is running locally
   - Set connection string:
     ```
     MONGODB_URI=mongodb://localhost:27017/gameforge
     PORT=5000
     CORS_ORIGIN=http://localhost:5173
     NODE_ENV=development
     ```

5. Start the backend server:
   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:5000/api`

### Frontend Setup

1. In the root directory, install dependencies:
   ```bash
   npm install
   ```

2. Ensure `.env.local` exists with:
   ```
   VITE_API_URL=http://localhost:5000/api
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The app will open at `http://localhost:5173`

## Available Endpoints

### Games API
- `GET /api/games` - Get all games (with optional filters: genre, featured, search)
- `GET /api/games/featured` - Get featured games only
- `GET /api/games/:id` - Get single game details
- `POST /api/games` - Create new game (seller only)
- `PATCH /api/games/:id` - Update game details
- `DELETE /api/games/:id` - Delete game

### Auth API
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/:id` - Get user profile
- `PATCH /api/auth/:id` - Update user profile

## Features

### Frontend
- Featured games carousel on homepage
- Indie games explore section with filtering
- Game detail pages with image galleries
- Buyer and seller dashboards
- User authentication UI
- Analytics and metrics
- Blog section
- Contact page with map integration
- Responsive design (mobile, tablet, desktop)

### Backend
- RESTful API with Express.js
- MongoDB database integration
- Game listings CRUD operations
- User authentication and profiles
- Featured game filtering
- Search functionality
- Role-based access (buyer, seller, admin)

## Development

Both the frontend and backend support hot-reloading during development:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
npm run dev
```

## Build

### Frontend
```bash
npm run build
```

### Backend
```bash
cd backend
npm run build
```

## Environment Variables

### Frontend (.env.local)
- `VITE_API_URL` - Backend API base URL (default: http://localhost:5000/api)
  - For production: set to your deployed backend URL

### Backend (.env)
- `MONGODB_URI` - MongoDB connection string
  - Local: `mongodb://localhost:27017/gameforge`
  - MongoDB Atlas: `mongodb+srv://username:password@cluster.mongodb.net/gameforge?retryWrites=true&w=majority`
- `PORT` - Server port (default: 5000)
- `CORS_ORIGIN` - Frontend origin for CORS (default: http://localhost:5173)
  - For production: set to your deployed frontend URL
- `NODE_ENV` - Environment (development/production)

## Deployment Notes

### MongoDB Atlas Setup
1. Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database user with read/write permissions
3. Whitelist your deployment server IP in Network Access
4. Copy the connection string and add to your `.env` file

### Production Checklist
- [ ] Use MongoDB Atlas for the database
- [ ] Set `NODE_ENV=production`
- [ ] Update `CORS_ORIGIN` to your production frontend URL
- [ ] Update frontend `VITE_API_URL` to your production backend URL
- [ ] Implement password hashing with bcrypt (currently plain text)
- [ ] Add JWT authentication for secure login tokens
- [ ] Enable HTTPS on your backend server
- [ ] Set up environment variables on your hosting platform

## Other Notes

- Default game data is generated with SVG-based artwork on the frontend
- Passwords are stored as plain text (not recommended for production - use bcrypt)
- JWT authentication should be added for production
