#!/usr/bin/env python3
"""
MES (Manufacturing Execution System) Backend API Test Suite
Tests all endpoints for Admin, Supervisor, and Worker roles
"""

import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional

class MESAPITester:
    def __init__(self, base_url="https://taskflow-system-6.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.supervisor_token = None
        self.worker_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Store created entities for cleanup and reference
        self.created_machines = []
        self.created_users = []
        self.created_work_orders = []
        self.created_tasks = []

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def make_request(self, method: str, endpoint: str, token: str = None, data: dict = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            else:
                return False, {}, 0

            return response.status_code < 400, response.json() if response.content else {}, response.status_code

        except Exception as e:
            return False, {"error": str(e)}, 0

    def test_init_data(self):
        """Initialize demo data"""
        print("\n🔧 Initializing demo data...")
        success, data, status = self.make_request('POST', 'init-data')
        self.log_test("Initialize demo data", success, f"Status: {status}")
        return success

    def test_login_all_users(self):
        """Test login for all user types"""
        print("\n🔐 Testing user authentication...")
        
        # Test admin login
        success, data, status = self.make_request('POST', 'auth/login', data={
            "username": "admin",
            "password": "admin123"
        })
        if success and 'token' in data:
            self.admin_token = data['token']
            self.log_test("Admin login", True)
        else:
            self.log_test("Admin login", False, f"Status: {status}")
            return False

        # Test supervisor login
        success, data, status = self.make_request('POST', 'auth/login', data={
            "username": "ustabasi1", 
            "password": "usta123"
        })
        if success and 'token' in data:
            self.supervisor_token = data['token']
            self.log_test("Supervisor login", True)
        else:
            self.log_test("Supervisor login", False, f"Status: {status}")

        # Test worker login
        success, data, status = self.make_request('POST', 'auth/login', data={
            "username": "eleman1",
            "password": "eleman123"
        })
        if success and 'token' in data:
            self.worker_token = data['token']
            self.log_test("Worker login", True)
        else:
            self.log_test("Worker login", False, f"Status: {status}")

        # Test invalid login
        success, data, status = self.make_request('POST', 'auth/login', data={
            "username": "invalid",
            "password": "invalid"
        })
        self.log_test("Invalid login rejection", not success and status == 401)

        return self.admin_token is not None

    def test_admin_user_management(self):
        """Test admin user management endpoints"""
        print("\n👥 Testing user management...")
        
        if not self.admin_token:
            self.log_test("User management (no admin token)", False, "Admin token required")
            return False

        # Get all users
        success, users, status = self.make_request('GET', 'users', self.admin_token)
        self.log_test("Get all users", success and isinstance(users, list))

        # Create new user
        new_user_data = {
            "username": f"test_user_{datetime.now().strftime('%H%M%S')}",
            "password": "test123",
            "full_name": "Test User",
            "role": "worker"
        }
        success, user_data, status = self.make_request('POST', 'users', self.admin_token, new_user_data)
        if success and 'id' in user_data:
            self.created_users.append(user_data['id'])
            self.log_test("Create new user", True)
            
            # Update user password
            success, _, status = self.make_request('PUT', f"users/{user_data['id']}", self.admin_token, {
                "password": "newpass123"
            })
            self.log_test("Update user password", success)
            
            # Delete user
            success, _, status = self.make_request('DELETE', f"users/{user_data['id']}", self.admin_token)
            self.log_test("Delete user", success)
            if success:
                self.created_users.remove(user_data['id'])
        else:
            self.log_test("Create new user", False, f"Status: {status}")

        # Test unauthorized access (worker trying to access users)
        success, _, status = self.make_request('GET', 'users', self.worker_token)
        self.log_test("Unauthorized user access blocked", not success and status == 403)

        return True

    def test_admin_machine_management(self):
        """Test machine management endpoints"""
        print("\n🏭 Testing machine management...")
        
        # Get all machines
        success, machines, status = self.make_request('GET', 'machines', self.admin_token)
        self.log_test("Get all machines", success and isinstance(machines, list))

        # Create new machine
        new_machine_data = {
            "name": f"Test Machine {datetime.now().strftime('%H%M%S')}",
            "code": f"TM{datetime.now().strftime('%H%M%S')}"
        }
        success, machine_data, status = self.make_request('POST', 'machines', self.admin_token, new_machine_data)
        if success and 'id' in machine_data:
            self.created_machines.append(machine_data['id'])
            self.log_test("Create new machine", True)
            
            # Update machine
            success, _, status = self.make_request('PUT', f"machines/{machine_data['id']}", self.admin_token, {
                "name": "Updated Machine Name"
            })
            self.log_test("Update machine", success)
            
        else:
            self.log_test("Create new machine", False, f"Status: {status}")

        # Test duplicate machine code
        success, _, status = self.make_request('POST', 'machines', self.admin_token, new_machine_data)
        self.log_test("Duplicate machine code rejected", not success and status == 400)

        # Test unauthorized machine creation (worker)
        success, _, status = self.make_request('POST', 'machines', self.worker_token, {
            "name": "Unauthorized Machine",
            "code": "UNAUTH"
        })
        self.log_test("Unauthorized machine creation blocked", not success and status == 403)

        return True

    def test_work_order_management(self):
        """Test work order management"""
        print("\n📋 Testing work order management...")
        
        # Get all work orders
        success, orders, status = self.make_request('GET', 'work-orders', self.admin_token)
        self.log_test("Get all work orders", success and isinstance(orders, list))

        # Create new work order (admin)
        new_order_data = {
            "order_no": f"WO-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
            "part_name": "Test Part",
            "quantity": 100,
            "description": "Test work order"
        }
        success, order_data, status = self.make_request('POST', 'work-orders', self.admin_token, new_order_data)
        if success and 'id' in order_data:
            self.created_work_orders.append(order_data['id'])
            self.log_test("Create work order (admin)", True)
        else:
            self.log_test("Create work order (admin)", False, f"Status: {status}")

        # Create work order (supervisor)
        supervisor_order_data = {
            "order_no": f"WO-SUP-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
            "part_name": "Supervisor Part",
            "quantity": 50
        }
        success, sup_order_data, status = self.make_request('POST', 'work-orders', self.supervisor_token, supervisor_order_data)
        if success and 'id' in sup_order_data:
            self.created_work_orders.append(sup_order_data['id'])
            self.log_test("Create work order (supervisor)", True)
        else:
            self.log_test("Create work order (supervisor)", False, f"Status: {status}")

        # Test unauthorized work order creation (worker)
        success, _, status = self.make_request('POST', 'work-orders', self.worker_token, {
            "order_no": "UNAUTHORIZED",
            "part_name": "Unauthorized Part",
            "quantity": 10
        })
        self.log_test("Unauthorized work order creation blocked", not success and status == 403)

        return True

    def test_task_management(self):
        """Test task management and assignment"""
        print("\n⚙️ Testing task management...")
        
        if not self.created_work_orders or not self.created_machines:
            self.log_test("Task management (missing prerequisites)", False, "Need work orders and machines")
            return False

        # Get all tasks
        success, tasks, status = self.make_request('GET', 'tasks', self.supervisor_token)
        self.log_test("Get all tasks", success and isinstance(tasks, list))

        # Create task (assign work order to machine)
        task_data = {
            "work_order_id": self.created_work_orders[0],
            "machine_id": self.created_machines[0],
            "quantity_assigned": 50
        }
        success, task_result, status = self.make_request('POST', 'tasks', self.supervisor_token, task_data)
        if success and 'id' in task_result:
            self.created_tasks.append(task_result['id'])
            self.log_test("Create task (assign to machine)", True)
            
            # Assign worker to task
            success, _, status = self.make_request('PUT', f"tasks/{task_result['id']}/assign-worker", 
                                                 self.supervisor_token, None)
            # This endpoint expects worker_id in URL, let's get worker ID first
            success, users, _ = self.make_request('GET', 'users', self.admin_token)
            if success:
                worker_user = next((u for u in users if u['role'] == 'worker'), None)
                if worker_user:
                    # The endpoint expects worker_id as query param, let's test the URL structure
                    success, _, status = self.make_request('PUT', f"tasks/{task_result['id']}/assign-worker?worker_id={worker_user['id']}", 
                                                         self.supervisor_token)
                    self.log_test("Assign worker to task", success)
        else:
            self.log_test("Create task (assign to machine)", False, f"Status: {status}")

        # Test unauthorized task creation (worker)
        success, _, status = self.make_request('POST', 'tasks', self.worker_token, task_data)
        self.log_test("Unauthorized task creation blocked", not success and status == 403)

        return True

    def test_worker_functionality(self):
        """Test worker-specific functionality"""
        print("\n👷 Testing worker functionality...")
        
        if not self.worker_token:
            self.log_test("Worker functionality (no token)", False, "Worker token required")
            return False

        # Get worker's tasks
        success, users, _ = self.make_request('GET', 'users', self.admin_token)
        if success:
            worker_user = next((u for u in users if u['username'] == 'eleman1'), None)
            if worker_user:
                success, worker_tasks, status = self.make_request('GET', f"tasks/worker/{worker_user['id']}", self.worker_token)
                self.log_test("Get worker tasks", success and isinstance(worker_tasks, list))
                
                # Test work log creation if tasks exist
                if success and worker_tasks and len(worker_tasks) > 0:
                    task_id = worker_tasks[0]['id']
                    
                    # Start preparation
                    log_data = {
                        "task_id": task_id,
                        "event_type": "prep_start"
                    }
                    success, _, status = self.make_request('POST', 'work-logs', self.worker_token, log_data)
                    self.log_test("Create work log (prep start)", success)
                    
                    # End preparation
                    log_data["event_type"] = "prep_end"
                    success, _, status = self.make_request('POST', 'work-logs', self.worker_token, log_data)
                    self.log_test("Create work log (prep end)", success)
                    
                    # Start work
                    log_data["event_type"] = "work_start"
                    success, _, status = self.make_request('POST', 'work-logs', self.worker_token, log_data)
                    self.log_test("Create work log (work start)", success)
                    
                    # Pause work
                    log_data.update({
                        "event_type": "work_pause",
                        "pause_reason": "break"
                    })
                    success, _, status = self.make_request('POST', 'work-logs', self.worker_token, log_data)
                    self.log_test("Create work log (work pause)", success)
                    
                    # Resume work
                    log_data = {
                        "task_id": task_id,
                        "event_type": "work_resume"
                    }
                    success, _, status = self.make_request('POST', 'work-logs', self.worker_token, log_data)
                    self.log_test("Create work log (work resume)", success)
                    
                    # Complete work
                    log_data.update({
                        "event_type": "work_complete",
                        "quantity_completed": 25
                    })
                    success, _, status = self.make_request('POST', 'work-logs', self.worker_token, log_data)
                    self.log_test("Create work log (work complete)", success)
                    
                    # Get task logs
                    success, logs, status = self.make_request('GET', f"work-logs/task/{task_id}", self.worker_token)
                    self.log_test("Get task work logs", success and isinstance(logs, list))

        return True

    def test_live_monitoring(self):
        """Test live monitoring dashboard"""
        print("\n📊 Testing live monitoring...")
        
        success, live_data, status = self.make_request('GET', 'dashboard/live-status', self.admin_token)
        self.log_test("Get live monitoring data", success and isinstance(live_data, list))
        
        return success

    def test_reporting(self):
        """Test reporting functionality"""
        print("\n📈 Testing reporting...")
        
        # Test daily report
        today = datetime.now().strftime('%Y-%m-%d')
        success, report_data, status = self.make_request('GET', f'reports/daily?date={today}', self.admin_token)
        self.log_test("Get daily report", success and 'date' in report_data)
        
        # Test unauthorized report access (worker)
        success, _, status = self.make_request('GET', f'reports/daily?date={today}', self.worker_token)
        self.log_test("Unauthorized report access blocked", not success and status == 403)
        
        return True

    def cleanup_test_data(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete created tasks
        for task_id in self.created_tasks:
            success, _, _ = self.make_request('DELETE', f'tasks/{task_id}', self.supervisor_token)
            if success:
                print(f"  Deleted task {task_id}")

        # Delete created work orders
        for order_id in self.created_work_orders:
            success, _, _ = self.make_request('DELETE', f'work-orders/{order_id}', self.admin_token)
            if success:
                print(f"  Deleted work order {order_id}")

        # Delete created machines
        for machine_id in self.created_machines:
            success, _, _ = self.make_request('DELETE', f'machines/{machine_id}', self.admin_token)
            if success:
                print(f"  Deleted machine {machine_id}")

        # Delete created users
        for user_id in self.created_users:
            success, _, _ = self.make_request('DELETE', f'users/{user_id}', self.admin_token)
            if success:
                print(f"  Deleted user {user_id}")

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting MES Backend API Test Suite")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)

        # Initialize data first
        if not self.test_init_data():
            print("❌ Failed to initialize demo data. Stopping tests.")
            return False

        # Test authentication
        if not self.test_login_all_users():
            print("❌ Authentication failed. Stopping tests.")
            return False

        # Run all test modules
        test_modules = [
            self.test_admin_user_management,
            self.test_admin_machine_management,
            self.test_work_order_management,
            self.test_task_management,
            self.test_worker_functionality,
            self.test_live_monitoring,
            self.test_reporting
        ]

        for test_module in test_modules:
            try:
                test_module()
            except Exception as e:
                print(f"❌ Test module {test_module.__name__} failed with error: {e}")

        # Cleanup
        self.cleanup_test_data()

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("✅ Backend API tests PASSED")
            return True
        else:
            print("❌ Backend API tests FAILED")
            return False

def main():
    tester = MESAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'summary': {
                'total_tests': tester.tests_run,
                'passed_tests': tester.tests_passed,
                'success_rate': (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
                'timestamp': datetime.now().isoformat()
            },
            'detailed_results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())