from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS
from database import Database
from datetime import datetime
import functools

app = Flask(__name__)
app.secret_key = 'your-secret-key-here-change-in-production-2026'
CORS(app)
db = Database()

def login_required(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'success': False, 'error': 'Please login first'}), 401
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session or session.get('role') != 'admin':
            return jsonify({'success': False, 'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    """Main page - Admin goes to dashboard, Customer goes to resources"""
    if 'user_id' in session:
        # If user is admin, redirect to admin dashboard
        if session.get('role') == 'admin':
            return redirect(url_for('admin_dashboard'))
        # Regular customers go to resources page
        return render_template('index.html', user=session.get('user_name'), role=session.get('role'))
    return redirect(url_for('login_page'))

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/register')
def register_page():
    return render_template('register.html')

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'customer')
    
    if not all([name, email, password]):
        return jsonify({'success': False, 'error': 'All fields are required'}), 400
    
    if '@' not in email or '.' not in email:
        return jsonify({'success': False, 'error': 'Invalid email format'}), 400
    
    existing_user = db.get_user_by_email(email)
    if existing_user:
        return jsonify({'success': False, 'error': 'Email already registered'}), 400
    
    user_id = db.create_user(name, email, password, role)
    
    if user_id:
        return jsonify({'success': True, 'message': 'Registration successful! Please login.'})
    else:
        return jsonify({'success': False, 'error': 'Registration failed'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not all([email, password]):
        return jsonify({'success': False, 'error': 'Email and password required'}), 400
    
    user = db.authenticate_user(email, password)
    
    if user:
        session['user_id'] = user['id']
        session['user_name'] = user['name']
        session['user_email'] = user['email']
        session['role'] = user['role']
        return jsonify({
            'success': True, 
            'message': f'Welcome back, {user["name"]}!',
            'user': {
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'role': user['role']
            }
        })
    else:
        return jsonify({'success': False, 'error': 'Invalid email or password'}), 401

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully'})

@app.route('/api/auth/me', methods=['GET'])
@login_required
def get_current_user():
    return jsonify({
        'success': True,
        'user': {
            'id': session['user_id'],
            'name': session['user_name'],
            'email': session['user_email'],
            'role': session['role']
        }
    })

@app.route('/api/resources', methods=['GET'])
@login_required
def get_resources():
    resource_type = request.args.get('type', 'all')
    
    if resource_type == 'all':
        resources = db.get_all_resources()
    else:
        resources = db.get_resources_by_type(resource_type)
    
    return jsonify({
        'success': True,
        'data': resources
    })

@app.route('/api/resources/<int:resource_id>', methods=['GET'])
@login_required
def get_resource(resource_id):
    resource = db.get_resource_by_id(resource_id)
    if resource:
        return jsonify({'success': True, 'data': resource})
    return jsonify({'success': False, 'error': 'Resource not found'}), 404

@app.route('/api/resources', methods=['POST'])
@admin_required
def create_resource():
    data = request.json
    
    required_fields = ['type', 'name', 'description', 'capacity', 'amenities']
    for field in required_fields:
        if field not in data:
            return jsonify({'success': False, 'error': f'Missing field: {field}'}), 400
    
    resource_id = db.create_resource(
        type=data['type'],
        name=data['name'],
        description=data['description'],
        capacity=data['capacity'],
        amenities=data['amenities']
    )
    
    if resource_id:
        return jsonify({'success': True, 'message': 'Resource created successfully', 'resource_id': resource_id})
    else:
        return jsonify({'success': False, 'error': 'Failed to create resource'}), 500

@app.route('/api/resources/<int:resource_id>', methods=['PUT'])
@admin_required
def update_resource(resource_id):
    data = request.json
    
    success = db.update_resource(resource_id, data)
    
    if success:
        return jsonify({'success': True, 'message': 'Resource updated successfully'})
    else:
        return jsonify({'success': False, 'error': 'Failed to update resource'}), 500

@app.route('/api/resources/<int:resource_id>', methods=['DELETE'])
@admin_required
def delete_resource(resource_id):
    success = db.delete_resource(resource_id)
    
    if success:
        return jsonify({'success': True, 'message': 'Resource deleted successfully'})
    else:
        return jsonify({'success': False, 'error': 'Failed to delete resource'}), 500

@app.route('/api/bookings', methods=['POST'])
@login_required
def create_booking():
    data = request.json
    
    if session.get('role') == 'admin':
        return jsonify({'success': False, 'error': 'Admin users cannot book resources'}), 403
    
    required_fields = ['resource_id', 'booking_date', 'start_time', 'end_time']
    for field in required_fields:
        if field not in data:
            return jsonify({'success': False, 'error': f'Missing field: {field}'}), 400
    
    booking_id = db.create_booking(
        resource_id=data['resource_id'],
        user_id=session['user_id'],
        user_name=session['user_name'],
        user_email=session['user_email'],
        booking_date=data['booking_date'],
        start_time=data['start_time'],
        end_time=data['end_time'],
        purpose=data.get('purpose', '')
    )
    
    if booking_id:
        return jsonify({
            'success': True,
            'message': 'Booking created successfully',
            'booking_id': booking_id
        })
    else:
        return jsonify({'success': False, 'error': 'Time slot not available'}), 409

@app.route('/api/bookings/check', methods=['POST'])
@login_required
def check_availability():
    if session.get('role') == 'admin':
        return jsonify({'success': False, 'error': 'Admin users cannot book resources'}), 403
    
    data = request.json
    resource_id = data.get('resource_id')
    booking_date = data.get('booking_date')
    start_time = data.get('start_time')
    end_time = data.get('end_time')
    
    if not all([resource_id, booking_date, start_time, end_time]):
        return jsonify({'success': False, 'error': 'Missing parameters'}), 400
    
    is_available = db.check_availability(resource_id, booking_date, start_time, end_time)
    return jsonify({
        'success': True,
        'available': is_available
    })

@app.route('/api/bookings/my', methods=['GET'])
@login_required
def get_my_bookings():
    bookings = db.get_bookings_by_user(session['user_id'])
    return jsonify({
        'success': True,
        'data': bookings
    })

@app.route('/api/bookings/all', methods=['GET'])
@admin_required
def get_all_bookings():
    bookings = db.get_all_bookings()
    return jsonify({
        'success': True,
        'data': bookings
    })

@app.route('/api/bookings/<int:booking_id>', methods=['PUT'])
@login_required
def update_booking(booking_id):
    data = request.json
    
    booking = db.get_booking_by_id(booking_id)
    if not booking:
        return jsonify({'success': False, 'error': 'Booking not found'}), 404
    
    if session['role'] != 'admin' and booking['user_id'] != session['user_id']:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    if not db.check_availability(booking['resource_id'], data['booking_date'], data['start_time'], data['end_time'], exclude_booking_id=booking_id):
        return jsonify({'success': False, 'error': 'Time slot not available'}), 409
    
    success = db.update_booking(booking_id, data)
    
    if success:
        return jsonify({'success': True, 'message': 'Booking updated successfully'})
    else:
        return jsonify({'success': False, 'error': 'Failed to update booking'}), 500

@app.route('/api/bookings/<int:booking_id>', methods=['DELETE'])
@login_required
def delete_booking(booking_id):
    booking = db.get_booking_by_id(booking_id)
    if not booking:
        return jsonify({'success': False, 'error': 'Booking not found'}), 404
    
    if session['role'] != 'admin' and booking['user_id'] != session['user_id']:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    success = db.cancel_booking(booking_id)
    
    if success:
        return jsonify({'success': True, 'message': 'Booking cancelled successfully'})
    else:
        return jsonify({'success': False, 'error': 'Failed to cancel booking'}), 500

@app.route('/dashboard')
@login_required
def customer_dashboard():
    return render_template('dashboard.html', user=session['user_name'], role=session['role'])

@app.route('/api/users/count', methods=['GET'])
@admin_required
def get_users_count():
    try:
        count = db.get_users_count()
        return jsonify({'success': True, 'count': count})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/admin/dashboard')
@admin_required
def admin_dashboard():
    return render_template('admin_dashboard.html', user=session['user_name'], role=session['role'])

@app.route('/analytics')
@admin_required
def analytics_page():
    """Analytics dashboard page"""
    return render_template('analytics.html', user=session.get('user_name'), role=session.get('role'))

@app.route('/resources')
@login_required
def resources_page():
    """Resources page for admin to view (but not book)"""
    return render_template('index.html', user=session.get('user_name'), role=session.get('role'))

if __name__ == '__main__':
    app.run(debug=True, port=5000)