import urllib.request
import json

BASE_URL = "http://127.0.0.1:8000"

def test_api():
    print("=" * 60)
    print("VERIFYING LIVE BACKEND FASTAPI ENDPOINTS")
    print("=" * 60)

    # 1. GET /docs
    req = urllib.request.Request(f"{BASE_URL}/docs")
    with urllib.request.urlopen(req) as resp:
        print(f"1. GET /docs -> Status: {resp.status} (OK)")

    # 2. POST /auth/login
    login_data = json.dumps({
        "username": "swetha_test",
        "password": "TestPassword123!"
    }).encode("utf-8")
    
    login_req = urllib.request.Request(
        f"{BASE_URL}/auth/login",
        data=login_data,
        headers={"Content-Type": "application/json"}
    )
    
    token = None
    with urllib.request.urlopen(login_req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        token = data.get("access_token")
        print(f"2. POST /auth/login -> Status: {resp.status}, Token Type: {data.get('token_type')}, Token present: {bool(token)}")

    assert token is not None, "Failed to obtain token from login"
    auth_header = {"Authorization": f"Bearer {token}"}

    # 3. GET /auth/me
    me_req = urllib.request.Request(f"{BASE_URL}/auth/me", headers=auth_header)
    with urllib.request.urlopen(me_req) as resp:
        me_data = json.loads(resp.read().decode("utf-8"))
        print(f"3. GET /auth/me -> Status: {resp.status}, User: {me_data.get('username')}, Role: {me_data.get('role')}")

    # 4. GET /members/
    members_req = urllib.request.Request(f"{BASE_URL}/members/", headers=auth_header)
    with urllib.request.urlopen(members_req) as resp:
        members_data = json.loads(resp.read().decode("utf-8"))
        print(f"4. GET /members/ -> Status: {resp.status}, Total Members in DB: {members_data.get('total_members')}")

    # 5. GET /api/email/sent-logs
    email_req = urllib.request.Request(f"{BASE_URL}/api/email/sent-logs", headers=auth_header)
    with urllib.request.urlopen(email_req) as resp:
        email_data = json.loads(resp.read().decode("utf-8"))
        print(f"6. GET /api/email/sent-logs -> Status: {resp.status}, Sent Logs Count: {len(email_data)}")

    # 7. POST /auth/register test with a test user
    import time
    test_reg_username = f"test_reg_user_{int(time.time())}"
    reg_data = json.dumps({
        "username": test_reg_username,
        "email": f"{test_reg_username}@example.com",
        "password": "TestPassword123!",
        "confirm_password": "TestPassword123!"
    }).encode("utf-8")
    
    reg_req = urllib.request.Request(
        f"{BASE_URL}/auth/register",
        data=reg_data,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(reg_req) as resp:
        reg_resp_data = json.loads(resp.read().decode("utf-8"))
        print(f"7. POST /auth/register -> Status: {resp.status}, Created User: {reg_resp_data.get('user', {}).get('username')}, Role Assigned: {reg_resp_data.get('user', {}).get('role')}")
        assert reg_resp_data.get('user', {}).get('role') == 'payer_viewer', "Registration must default to payer_viewer"

    print("=" * 60)
    print("ALL LIVE BACKEND ENDPOINTS VERIFIED SUCCESSFULLY")
    print("=" * 60)

if __name__ == "__main__":
    test_api()
