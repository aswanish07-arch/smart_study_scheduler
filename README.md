# Smart Study Scheduler

A rule-based system that assists students in organizing their study time efficiently. This application helps students balance multiple subjects, deadlines, and personal commitments by automatically generating optimized study schedules.

## Features

- **User Registration & Authentication**: Secure user accounts with JWT-based authentication
- **Subject Management**: Add, edit, and delete subjects with priorities, deadlines, and topics
- **Rule-Based Scheduling**: Automatic schedule generation based on:
  - Subject priority (1 = highest, 5 = lowest)
  - Deadline proximity
  - Maximum study session duration
  - Mandatory break intervals
  - Available study hours per day
- **Daily & Weekly Views**: View your study schedule in daily or weekly format
- **Progress Tracking**: Mark completed study sessions and monitor your progress
- **Balanced Workload**: Ensures even distribution of study time across subjects

## Technology Stack

- **Backend**: Node.js with Express.js
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Authentication**: JWT (JSON Web Tokens) with bcrypt for password hashing
- **Data Storage**: JSON file-based storage (no database required)

## Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   ```

3. **Access the Application**
   Open your browser and navigate to: `http://localhost:3000`

## Usage

### Getting Started

1. **Register/Login**: Create a new account or login with existing credentials
2. **Add Subjects**: 
   - Click "Add Subject" to create a new subject
   - Enter subject name, priority (1-5), deadline, estimated hours, and topics
   - Priority 1 is highest priority, 5 is lowest
3. **Generate Schedule**:
   - Navigate to the Schedule tab
   - Configure your schedule settings:
     - Available hours per day
     - Maximum session duration
     - Break duration between sessions
     - Start date
   - Click "Generate Schedule" to create your study plan
4. **Track Progress**:
   - Mark study sessions as complete
   - View your overall progress and remaining sessions
   - Monitor completion rates and hours studied

### Scheduling Rules

The system follows these rules when generating schedules:

1. **Priority Sorting**: Subjects are sorted first by priority (lower number = higher priority)
2. **Deadline Proximity**: Among subjects with the same priority, earlier deadlines are scheduled first
3. **Session Limits**: No single session exceeds the maximum session duration
4. **Break Intervals**: Mandatory breaks are inserted between study sessions
5. **Daily Limits**: Total study time per day does not exceed available hours
6. **Workload Balance**: Study time is distributed evenly across available days

## Project Structure

```
smart-study-scheduler/
├── server.js              # Express server and API endpoints
├── package.json           # Node.js dependencies
├── data/                  # JSON data storage (created automatically)
│   ├── users.json        # User accounts
│   ├── subjects.json     # Subject data
│   ├── schedules.json    # Generated schedules
│   └── progress.json     # Progress tracking data
├── public/               # Frontend files
│   ├── index.html       # Main HTML file
│   ├── styles.css       # Styling
│   └── app.js           # Frontend JavaScript
└── README.md            # This file
```

## API Endpoints

### Authentication
- `POST /api/register` - Register a new user
- `POST /api/login` - Login user

### Subjects
- `GET /api/subjects` - Get all subjects for current user
- `POST /api/subjects` - Create a new subject
- `PUT /api/subjects/:id` - Update a subject
- `DELETE /api/subjects/:id` - Delete a subject

### Schedule
- `POST /api/schedule/generate` - Generate a new schedule
- `GET /api/schedule` - Get current schedule

### Progress
- `GET /api/progress` - Get progress data
- `POST /api/progress` - Update session progress

## Security Notes

- The JWT secret key in `server.js` should be changed in production
- Passwords are hashed using bcrypt
- All API endpoints (except auth) require JWT authentication

## Future Enhancements

Potential improvements for future versions:
- Database integration (MongoDB, PostgreSQL)
- Email reminders for upcoming study sessions
- Calendar integration
- Mobile app version
- Study analytics and insights
- Customizable scheduling rules
- Subject categories and tags

## License

MIT License

## Author

Smart Study Scheduler - A rule-based study planning system
