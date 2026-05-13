### BookSpace
BookSpace is a comprehensive resource booking management system built with Flask, SQLite, and modern web technologies. It allows organizations to efficiently manage and book various resources such as meeting rooms, lab equipment, and study pods.

## Features

### Authentication & Authorization
- User registration and login with password hashing
- Role-based access control (Admin & Customer roles)
- Session management with Flask sessions

### Admin Capabilities
- Full CRUD operations on resources
- View all bookings across all users
- Cancel any booking
- Add, edit, or delete resources (Meeting Rooms, Lab Equipment, Study Pods)

### Customer Capabilities
- Browse and filter available resources
- Book resources with date/time selection
- View personal booking history
- Edit upcoming bookings (change date/time)
- Cancel own bookings
- Automatic conflict detection (no double-booking)

### Dashboard Features
- Customer dashboard: View, edit, and cancel personal bookings
- Admin dashboard: Complete system overview with search and filter

### Technical Stack
- Backend: Python Flask with SQLite3
- Frontend: HTML5, CSS3, Vanilla JavaScript
- Authentication: SHA-256 password hashing
- Database: SQLite with proper relations and foreign keys

## Quick Start

1. Clone the repository
2. Install dependencies: `pip install flask flask-cors`
3. Run: `python app.py`
4. Access at `http://localhost:5000`

### Default Login Credentials
- Admin: admin@bookspace.com / admin123
- Customer: customer@bookspace.com / customer123

## Project Structure
