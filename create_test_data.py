#!/usr/bin/env python3
import requests
import json

API_URL = "https://taskflow-system-6.preview.emergentagent.com/api"

# Login as admin
admin_login = requests.post(f"{API_URL}/auth/login", json={
    "username": "admin",
    "password": "admin123"
})
admin_token = admin_login.json()["token"]
headers = {"Authorization": f"Bearer {admin_token}"}

print("✅ Admin logged in")

# Get machines
machines = requests.get(f"{API_URL}/machines", headers=headers).json()
print(f"Found {len(machines)} machines")

# Create work order
work_order = requests.post(f"{API_URL}/work-orders", headers=headers, json={
    "order_no": "WO-TEST-001",
    "part_name": "Test Parça",
    "quantity": 100,
    "description": "Test iş emri"
})
work_order_data = work_order.json()
print(f"✅ Work order created: {work_order_data['id']}")

# Login as supervisor
supervisor_login = requests.post(f"{API_URL}/auth/login", json={
    "username": "ustabasi1",
    "password": "usta123"
})
supervisor_token = supervisor_login.json()["token"]
supervisor_headers = {"Authorization": f"Bearer {supervisor_token}"}

# Create task (assign work order to machine)
if machines:
    task = requests.post(f"{API_URL}/tasks", headers=supervisor_headers, json={
        "work_order_id": work_order_data["id"],
        "machine_id": machines[0]["id"],
        "quantity_assigned": 50
    })
    task_data = task.json()
    print(f"✅ Task created and assigned to machine: {task_data['id']}")
    print(f"Machine: {machines[0]['name']} ({machines[0]['code']})")
else:
    print("❌ No machines available")

print("🎉 Test data created successfully!")
