# SCRUM Planning Poker

A real-time SCRUM planning poker application that allows teams to estimate user stories collaboratively. Team members can join rooms, vote on estimates, and reveal results together.

## Features

- Create ephemeral rooms with auto-generated IDs
- Join rooms with just a username
- Vote on estimates using standard planning poker values
- Hidden votes until reveal
- Reset voting for new rounds
- Real-time updates using WebSocket
- Clean and modern UI

## Prerequisites

- Node.js 16+ and npm

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd scrum-poker
```

2. Install frontend dependencies:
```bash
npm install
```

3. Install backend dependencies (if applicable):
```bash
cd server
npm install
```

## Running the Application

1. Start the backend server (if applicable):
```bash
cd server
npm run dev
```

2. In a new terminal, start the frontend development server:
```bash
# From the root directory
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

## Usage

1. On the home page, click "Create New Room" to generate a new planning poker session
2. Share the room URL with your team members
3. Each team member enters their name to join the room
4. Select your estimate by clicking on a number
5. When everyone has voted, click "Reveal Votes" to show all estimates
6. Use "Reset Votes" to start a new round

## Development

- Frontend: React with TypeScript and Vite
- Backend: Node.js with Express and Socket.IO
- Styling: Tailwind CSS
