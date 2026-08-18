import json
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000"

def make_request(url, method="GET", data=None, headers=None):
    req_headers = headers.copy() if headers else {}
    req_data = None
    if data is not None:
        if isinstance(data, dict):
            req_data = json.dumps(data).encode("utf-8")
            req_headers["Content-Type"] = "application/json"
        elif isinstance(data, bytes):
            req_data = data

    req = urllib.request.Request(url, data=req_data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            resp_body = resp.read().decode("utf-8")
            return resp.status, json.loads(resp_body) if resp_body else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(err_body)
        except Exception:
            parsed = {"raw": err_body}
        return e.code, parsed


def login_and_get_token(username, password):
    status, resp = make_request(f"{BASE_URL}/auth/login", method="POST", data={"username": username, "password": password})
    assert status == 200, f"Login failed for {username}: {resp}"
    return resp["access_token"]


def test_admin_role_management():
    print("=" * 80)
    print("TESTING ADMIN USER MANAGEMENT & ROLE-CHANGE PERMISSION WORKFLOW")
    print("=" * 80)

    # 1. Admin Login
    admin_token = login_and_get_token("admin1", "admin@123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Admin retrieves user list via GET /auth/users
    status, users_resp = make_request(f"{BASE_URL}/auth/users", headers=admin_headers)
    print(f"1. Admin GET /auth/users -> HTTP {status}")
    assert status == 200, f"Failed to list users: {users_resp}"
    users = users_resp.get("users", [])
    print(f"   Found {len(users)} registered users.")
    
    target_user = next((u for u in users if u["username"] == "clinical1"), None)
    admin_user = next((u for u in users if u["username"] == "admin1"), None)
    assert target_user is not None, "clinical1 user not found in database"
    assert admin_user is not None, "admin1 user not found in database"

    target_id = target_user["id"]
    admin_id = admin_user["id"]
    original_role = target_user["role"]

    print(f"   Target User: {target_user['username']} (ID: {target_id}, Current Role: {original_role})")

    # 3. Non-admin role-change attempt -> must fail with 403 Forbidden
    viewer_token = login_and_get_token("payer_viewer_test", "TestPassword123!")
    viewer_headers = {"Authorization": f"Bearer {viewer_token}"}
    
    status, err_resp = make_request(
        f"{BASE_URL}/auth/users/{target_id}/role",
        method="PATCH",
        data={"role": "payer_admin"},
        headers=viewer_headers
    )
    print(f"2. Unauthorized (Viewer) PATCH /auth/users/{target_id}/role -> HTTP {status} ({err_resp.get('detail')})")
    assert status == 403, f"Expected 403, got {status}"

    # 4. Admin cannot change their own role (self-demotion prevention) -> must fail with 400 Bad Request
    status, self_err_resp = make_request(
        f"{BASE_URL}/auth/users/{admin_id}/role",
        method="PATCH",
        data={"role": "payer_viewer"},
        headers=admin_headers
    )
    print(f"3. Admin Self-Role Change Attempt PATCH /auth/users/{admin_id}/role -> HTTP {status} ({self_err_resp.get('detail')})")
    assert status == 400, f"Expected 400, got {status}"

    # 5. Admin updates clinical1 -> care_manager
    print("\n4. Admin updating clinical1 role -> care_manager...")
    status, update_resp = make_request(
        f"{BASE_URL}/auth/users/{target_id}/role",
        method="PATCH",
        data={"role": "care_manager"},
        headers=admin_headers
    )
    print(f"   Admin PATCH /auth/users/{target_id}/role -> HTTP {status}")
    assert status == 200, f"Failed to update role: {update_resp}"
    print(f"   Response: User '{update_resp.get('user', {}).get('username')}' role updated from '{update_resp.get('user', {}).get('old_role')}' to '{update_resp.get('user', {}).get('new_role')}'")

    # 6. Target user (clinical1) logs in again, obtains fresh JWT, verifies new role
    print("\n5. User 'clinical1' logs in to obtain fresh JWT...")
    fresh_clinical_token = login_and_get_token("clinical1", "clinical@123")
    status, me_resp = make_request(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {fresh_clinical_token}"})
    print(f"   clinical1 GET /auth/me -> HTTP {status}, New Role: {me_resp.get('role')}")
    assert status == 200 and me_resp.get("role") == "care_manager", "Fresh JWT did not reflect updated role"

    # 7. Admin restores clinical1 -> clinical_analyst
    print("\n6. Admin restoring clinical1 role -> clinical_analyst...")
    status, restore_resp = make_request(
        f"{BASE_URL}/auth/users/{target_id}/role",
        method="PATCH",
        data={"role": "clinical_analyst"},
        headers=admin_headers
    )
    print(f"   Admin PATCH /auth/users/{target_id}/role -> HTTP {status}")
    assert status == 200, f"Failed to restore role: {restore_resp}"

    # 8. Target user logs in again, verifies restored role
    restored_token = login_and_get_token("clinical1", "clinical@123")
    status, restored_me_resp = make_request(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {restored_token}"})
    print(f"   clinical1 GET /auth/me -> HTTP {status}, Restored Role: {restored_me_resp.get('role')}")
    assert status == 200 and restored_me_resp.get("role") == "clinical_analyst", "Role was not restored"

    print("\n" + "=" * 80)
    print("ALL ADMIN ROLE-MANAGEMENT AND ACCESS PERMISSION TESTS PASSED!")
    print("=" * 80)

if __name__ == "__main__":
    test_admin_role_management()
