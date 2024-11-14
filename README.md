# Grouper

A local-first tool for creating optimized student groups based on pairing history. Grouper helps teachers create student groups while keeping track of previous pairings to ensure students work with different classmates over time.

## Features
- Create random groups of any size
- Track how often students work together
- Optimize groups based on pairing history
- Store all data locally on your computer
- Drag and drop interface for adjusting groups
- Display mode for showing groups to students

## Installation

### Step 1: Install Node.js
1. Visit https://nodejs.org/
2. Download the "LTS" (Long Term Support) version for your operating system
3. Run the installer
4. Verify installation by opening a terminal/command prompt and typing:
   ```bash
   node --version
   ```
   You should see a version number (v16 or higher)

### Step 2: Get the Project
1. Download this project (green "Code" button → "Download ZIP")
2. Unzip the file to a location you can easily find
3. Rename the folder to "grouper" if you want

### Step 3: Set Up the Project
1. Open a terminal/command prompt
   - Windows: Press Win+R, type "cmd", press Enter
   - Mac: Press Cmd+Space, type "terminal", press Enter
   - Linux: Press Ctrl+Alt+T

2. Navigate to the project folder:
   ```bash
   cd path/to/grouper
   ```
   Replace "path/to/grouper" with the actual path where you unzipped the project

3. Install dependencies:
   ```bash
   npm install
   ```

4. Initialize the database:
   ```bash
   npm run db:migrate
   ```

5. Start the application:
   ```bash
   npm run dev
   ```

6. Open your web browser and go to:
   ```
   http://localhost:5173
   ```

## Using Grouper

### Creating a Class
1. Click "Create Class" on the home page
2. Enter the class name
3. Add students using the form or paste a list

### Creating Groups
1. Select your class from the home page
2. Check the boxes next to present students
3. Set the desired group size
4. Click "Create Random Groups"
5. Drag and drop students between groups if needed
6. Click "Save Groups" to record the groupings

### Viewing Student History
1. Click "History" next to any student to see:
   - Students they've never worked with
   - How many times they've worked with each classmate
   - Previous group assignments

### Display Mode
1. Click "Display Groups" to show a clean view for students
2. Use the "Print Groups" button to print or save as PDF

## Troubleshooting

### Common Issues
- If the app doesn't start, make sure Node.js is installed correctly
- If you see database errors, try running `npm run db:migrate` again
- If students appear multiple times, try refreshing the page

### Getting Help
- Check the [Issues](https://github.com/yourusername/grouper/issues) page
- Submit a new issue if you find a bug
- Contact the developer at [your-email]

## Development

For developers who want to modify the code:
