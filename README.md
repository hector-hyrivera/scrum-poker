# SCRUM Planning Poker

[![Build Status](#)](#) [![License](LICENSE)](LICENSE) [![Node Version](https://img.shields.io/badge/node-16%2B-brightgreen)](https://nodejs.org/)

A real-time SCRUM planning poker application that allows teams to estimate user stories collaboratively. Team members can join rooms, vote on estimates, and reveal results together.

## Table of Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Configuration](#configuration)
- [Development](#development)
- [Testing](#testing)
- [API Reference](#api-reference)
- [Accessibility & Security](#accessibility--security)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Features

- Create ephemeral rooms with auto-generated IDs
- Join rooms with just a username
- Vote on estimates using standard planning poker values
- Hidden votes until reveal
- Reset voting for new rounds
- Real-time updates using WebSocket
- Clean and modern UI
- Track history of winning votes

## Screenshots

<!-- Add screenshots or GIFs here -->

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Docker (optional for containerized deployment)

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd scrum-poker
   ```

2. Install frontend dependencies:

   ```bash
   npm install
   ```

3. Install backend dependencies:

   ```bash
   cd server
   npm install
   ```

### Running the Application

#### Local Development

1. Start the backend server:

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

#### Using Docker

1. Build and start the containers:

   ```bash
   docker-compose up --build
   ```

2. Access the application at `http://localhost:8085`

## Usage

1. On the home page, click "Create New Room" to generate a new planning poker session.
2. Share the room URL with your team members.
3. Each team member enters their name to join the room.
4. Select your estimate by clicking on a number.
5. When everyone has voted, click "Reveal Votes" to show all estimates.
6. Use "Reset Votes" to start a new round.

## Configuration

For detailed configuration, see [docs/configuration.md](docs/configuration.md).

## Development

- **Frontend**: React with TypeScript, Vite, Material UI, Framer Motion, and Tailwind CSS
- **Backend**: Node.js with Express, Socket.IO, and TypeScript
- **Styling**: Tailwind CSS and Material UI

### Additional Commands

- Lint the code:

  ```bash
  npm run lint
  ```

- Preview the production build:

  ```bash
  npm run preview
  ```

## Testing

<!-- Add instructions for running tests, or note if not implemented -->

## API Reference

<!-- Briefly describe backend endpoints, or link to API docs -->

## Accessibility & Security

<!-- Note accessibility features and security best practices -->

## Contributing

Contributions are welcome! Please follow these guidelines:

- Use feature/bugfix/hotfix branch naming conventions
- Write clear, descriptive commit messages
- Ensure code passes linting and tests
- See [CONTRIBUTING.md](CONTRIBUTING.md) if available

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Contact

For issues, open a GitHub issue or contact [your-email@example.com](mailto:your-email@example.com).
