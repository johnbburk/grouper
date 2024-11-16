#!/bin/bash

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Step 1: Install Node.js
if ! command_exists node; then
    echo "Node.js is not installed. Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "Node.js is already installed."
fi

# Verify Node.js installation
node_version=$(node --version)
echo "Node.js version: $node_version"

# Step 2: Get the Project
echo "Downloading the project..."
curl -L -o grouper.zip https://github.com/johnbburk/grouper/archive/refs/heads/main.zip

echo "Unzipping the project..."
unzip grouper.zip
mv grouper-main grouper
cd grouper || exit

# Step 3: Set Up the Project
echo "Installing project dependencies..."
npm install

echo "Initializing the database..."
npm run db:migrate

echo "Starting the application..."
npm run dev &

echo "Opening the application in the default web browser..."
xdg-open http://localhost:5173 || open http://localhost:5173

echo "Installation and setup complete!"