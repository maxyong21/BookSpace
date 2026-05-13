from supabase import create_client
import requests
from datetime import datetime
import json
import os
import hashlib
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Database:
    def __init__(self, db_path=None):
        """Initialize Supabase connection"""
        self.supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_KEY")
        )
    
    def hash_password(self, password):
        """Hash password using SHA256 """
        return hashlib.sha256(password.encode()).hexdigest()
    
    # User management methods
    def create_user(self, name, email, password, role='customer'):
        """Create a new user"""
        try:
            hashed_password = self.hash_password(password)
            response = self.supabase.table('users').insert({
                'name': name,
                'email': email,
                'password': hashed_password,
                'role': role
            }).execute()
            
            return response.data[0]['id'] if response.data else None
        except Exception as e:
            print(f"Error creating user: {e}")
            return None
    
    def get_user_by_email(self, email):
        """Get user by email"""
        try:
            response = self.supabase.table('users').select('*').eq('email', email).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error getting user: {e}")
            return None
    
    def authenticate_user(self, email, password):
        """Authenticate user"""
        try:
            hashed_password = self.hash_password(password)
            response = self.supabase.table('users')\
                .select('*')\
                .eq('email', email)\
                .eq('password', hashed_password)\
                .execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error authenticating user: {e}")
            return None
    
    def get_users_count(self):
        """Get total number of users"""
        try:
            response = self.supabase.table('users').select('*', count='exact').limit(0).execute()
            return response.count if response.count else 0
        except Exception as e:
            print(f"Error getting users count: {e}")
            return 0
    
    def get_user_by_id(self, user_id):
        """Get user by ID"""
        try:
            response = self.supabase.table('users').select('*').eq('id', user_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error getting user: {e}")
            return None
    
    def get_all_users(self):
        """Get all users (admin only)"""
        try:
            response = self.supabase.table('users').select('*').order('created_at', desc=True).execute()
            # Remove passwords from response
            for user in response.data:
                if 'password' in user:
                    user['password'] = ''
            return response.data
        except Exception as e:
            print(f"Error getting all users: {e}")
            return []
    
    def update_user_role(self, user_id, role):
        """Update user role (admin only)"""
        try:
            response = self.supabase.table('users').update({'role': role}).eq('id', user_id).execute()
            return len(response.data) > 0
        except Exception as e:
            print(f"Error updating user role: {e}")
            return False
    
    def delete_user(self, user_id):
        """Delete user (admin only)"""
        try:
            # First delete all bookings by this user
            self.supabase.table('bookings').delete().eq('user_id', user_id).execute()
            # Then delete the user
            response = self.supabase.table('users').delete().eq('id', user_id).execute()
            return len(response.data) > 0
        except Exception as e:
            print(f"Error deleting user: {e}")
            return False
    
    # Resource management methods
    def get_all_resources(self):
        """Get all resources from database"""
        try:
            response = self.supabase.table('resources').select('*').order('type').order('name').execute()
            
            result = []
            for res in response.data:
                if res.get('amenities'):
                    try:
                        res['amenities'] = json.loads(res['amenities'])
                    except:
                        res['amenities'] = []
                else:
                    res['amenities'] = []
                result.append(res)
            return result
        except Exception as e:
            print(f"Error getting resources: {e}")
            return []
    
    def get_resources_by_type(self, resource_type):
        """Get resources filtered by type"""
        try:
            response = self.supabase.table('resources')\
                .select('*')\
                .eq('type', resource_type)\
                .order('name')\
                .execute()
            
            result = []
            for res in response.data:
                if res.get('amenities'):
                    try:
                        res['amenities'] = json.loads(res['amenities'])
                    except:
                        res['amenities'] = []
                else:
                    res['amenities'] = []
                result.append(res)
            return result
        except Exception as e:
            print(f"Error getting resources by type: {e}")
            return []
    
    def get_resource_by_id(self, resource_id):
        """Get a single resource by ID"""
        try:
            response = self.supabase.table('resources').select('*').eq('id', resource_id).execute()
            if response.data:
                res = response.data[0]
                if res.get('amenities'):
                    try:
                        res['amenities'] = json.loads(res['amenities'])
                    except:
                        res['amenities'] = []
                else:
                    res['amenities'] = []
                return res
            return None
        except Exception as e:
            print(f"Error getting resource: {e}")
            return None
    
    def create_resource(self, type, name, description, capacity, amenities):
        """Create a new resource"""
        try:
            response = self.supabase.table('resources').insert({
                'type': type,
                'name': name,
                'description': description,
                'capacity': capacity,
                'amenities': json.dumps(amenities)
            }).execute()
            
            return response.data[0]['id'] if response.data else None
        except Exception as e:
            print(f"Error creating resource: {e}")
            return None
    
    def update_resource(self, resource_id, data):
        """Update a resource"""
        try:
            update_data = {}
            for key in ['type', 'name', 'description', 'capacity']:
                if key in data:
                    update_data[key] = data[key]
            if 'amenities' in data:
                update_data['amenities'] = json.dumps(data['amenities'])
            
            response = self.supabase.table('resources').update(update_data).eq('id', resource_id).execute()
            return len(response.data) > 0
        except Exception as e:
            print(f"Error updating resource: {e}")
            return False
    
    def delete_resource(self, resource_id):
        """Delete a resource"""
        try:
            response = self.supabase.table('resources').delete().eq('id', resource_id).execute()
            return len(response.data) > 0
        except Exception as e:
            print(f"Error deleting resource: {e}")
            return False
    
    # Booking management methods
    def create_booking(self, resource_id, user_id, user_name, user_email, booking_date, start_time, end_time, purpose=''):
        """Create a new booking after checking availability"""
        if not self.check_availability(resource_id, booking_date, start_time, end_time):
            return None
        
        try:
            response = self.supabase.table('bookings').insert({
                'resource_id': resource_id,
                'user_id': user_id,
                'user_name': user_name,
                'user_email': user_email,
                'booking_date': booking_date,
                'start_time': start_time,
                'end_time': end_time,
                'purpose': purpose,
                'status': 'confirmed'
            }).execute()
            
            return response.data[0]['id'] if response.data else None
        except Exception as e:
            print(f"Error creating booking: {e}")
            return None
    
    def check_availability(self, resource_id, booking_date, start_time, end_time, exclude_booking_id=None):
        """Check if a resource is available for the given time slot"""
        try:
            response = self.supabase.table('bookings')\
                .select('*')\
                .eq('resource_id', resource_id)\
                .eq('booking_date', booking_date)\
                .eq('status', 'confirmed')\
                .execute()
            
            bookings = response.data
            
            # 排除当前预订（用于更新时）
            if exclude_booking_id:
                bookings = [b for b in bookings if b['id'] != exclude_booking_id]
            
            # 检查时间冲突
            for booking in bookings:
                # 如果有重叠返回 False
                if not (end_time <= booking['start_time'] or start_time >= booking['end_time']):
                    return False
            return True
            
        except Exception as e:
            print(f"Error checking availability: {e}")
            return False
    
    def get_bookings_by_user(self, user_id):
        """Get all bookings for a specific user"""
        try:
            response = self.supabase.table('bookings')\
                .select('*, resources(name, type)')\
                .eq('user_id', user_id)\
                .order('booking_date', desc=True)\
                .order('start_time')\
                .execute()
            
            bookings = []
            for booking in response.data:
                booking_copy = booking.copy()
                if 'resources' in booking_copy:
                    booking_copy['resource_name'] = booking_copy['resources']['name']
                    booking_copy['resource_type'] = booking_copy['resources']['type']
                    del booking_copy['resources']
                bookings.append(booking_copy)
            return bookings
        except Exception as e:
            print(f"Error getting user bookings: {e}")
            return []
    
    def get_all_bookings(self):
        """Get all bookings (admin view)"""
        try:
            response = self.supabase.table('bookings')\
                .select('*, resources(name, type)')\
                .order('booking_date', desc=True)\
                .order('start_time')\
                .execute()
            
            bookings = []
            for booking in response.data:
                booking_copy = booking.copy()
                if 'resources' in booking_copy:
                    booking_copy['resource_name'] = booking_copy['resources']['name']
                    booking_copy['resource_type'] = booking_copy['resources']['type']
                    del booking_copy['resources']
                bookings.append(booking_copy)
            return bookings
        except Exception as e:
            print(f"Error getting all bookings: {e}")
            return []
    
    def get_booking_by_id(self, booking_id):
        """Get a single booking by ID"""
        try:
            response = self.supabase.table('bookings')\
                .select('*, resources(name, type)')\
                .eq('id', booking_id)\
                .execute()
            
            if response.data:
                booking = response.data[0].copy()
                if 'resources' in booking:
                    booking['resource_name'] = booking['resources']['name']
                    booking['resource_type'] = booking['resources']['type']
                    del booking['resources']
                return booking
            return None
        except Exception as e:
            print(f"Error getting booking: {e}")
            return None
    
    def update_booking(self, booking_id, data):
        """Update a booking"""
        try:
            update_data = {}
            for key in ['booking_date', 'start_time', 'end_time', 'purpose']:
                if key in data:
                    update_data[key] = data[key]
            
            response = self.supabase.table('bookings').update(update_data).eq('id', booking_id).execute()
            return len(response.data) > 0
        except Exception as e:
            print(f"Error updating booking: {e}")
            return False
    
    def cancel_booking(self, booking_id):
        """Cancel a booking"""
        try:
            response = self.supabase.table('bookings').update({'status': 'cancelled'}).eq('id', booking_id).execute()
            return len(response.data) > 0
        except Exception as e:
            print(f"Error cancelling booking: {e}")
            return False
    
    def get_bookings_by_date_range(self, start_date, end_date):
        """Get bookings within date range"""
        try:
            response = self.supabase.table('bookings')\
                .select('*, resources(name, type)')\
                .gte('booking_date', start_date)\
                .lte('booking_date', end_date)\
                .order('booking_date', desc=True)\
                .execute()
            
            bookings = []
            for booking in response.data:
                booking_copy = booking.copy()
                if 'resources' in booking_copy:
                    booking_copy['resource_name'] = booking_copy['resources']['name']
                    booking_copy['resource_type'] = booking_copy['resources']['type']
                    del booking_copy['resources']
                bookings.append(booking_copy)
            return bookings
        except Exception as e:
            print(f"Error getting bookings by date range: {e}")
            return []
    
    def get_upcoming_bookings(self, days=7):
        """Get upcoming bookings for next N days"""
        try:
            from datetime import datetime, timedelta
            today = datetime.now().strftime('%Y-%m-%d')
            future = (datetime.now() + timedelta(days=days)).strftime('%Y-%m-%d')
            
            response = self.supabase.table('bookings')\
                .select('*, resources(name, type)')\
                .eq('status', 'confirmed')\
                .gte('booking_date', today)\
                .lte('booking_date', future)\
                .order('booking_date')\
                .order('start_time')\
                .execute()
            
            bookings = []
            for booking in response.data:
                booking_copy = booking.copy()
                if 'resources' in booking_copy:
                    booking_copy['resource_name'] = booking_copy['resources']['name']
                    booking_copy['resource_type'] = booking_copy['resources']['type']
                    del booking_copy['resources']
                bookings.append(booking_copy)
            return bookings
        except Exception as e:
            print(f"Error getting upcoming bookings: {e}")
            return []
    
    def get_booking_statistics(self):
        """Get booking statistics"""
        try:
            # Get total confirmed bookings
            confirmed_response = self.supabase.table('bookings')\
                .select('*', count='exact')\
                .eq('status', 'confirmed')\
                .execute()
            
            # Get total cancelled bookings
            cancelled_response = self.supabase.table('bookings')\
                .select('*', count='exact')\
                .eq('status', 'cancelled')\
                .execute()
            
            # Get total distinct users who booked
            users_response = self.supabase.table('bookings')\
                .select('user_id')\
                .execute()
            
            unique_users = len(set([b['user_id'] for b in users_response.data])) if users_response.data else 0
            
            confirmed_count = confirmed_response.count if confirmed_response.count else 0
            cancelled_count = cancelled_response.count if cancelled_response.count else 0
            
            return {
                'confirmed': confirmed_count,
                'cancelled': cancelled_count,
                'total': confirmed_count + cancelled_count,
                'unique_users': unique_users
            }
        except Exception as e:
            print(f"Error getting booking statistics: {e}")
            return {
                'confirmed': 0,
                'cancelled': 0,
                'total': 0,
                'unique_users': 0
            }
    

# For direct testing
if __name__ == '__main__':
    db = Database()
    print("\n" + "="*50)
    print("Database Status (Supabase)")
    print("="*50)
    
    resources = db.get_all_resources()
    print(f"✓ Found {len(resources)} resources in database")
    
    bookings = db.get_all_bookings()
    print(f"✓ Found {len(bookings)} bookings in database")
    
    users_count = db.get_users_count()
    print(f"✓ Found {users_count} users in database")
    
    print("="*50)