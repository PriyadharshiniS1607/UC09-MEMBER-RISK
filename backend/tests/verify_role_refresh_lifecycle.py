import io
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


def build_multipart_csv(field_name, filename, csv_content):
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    body = io.BytesIO()
    body.write(f"--{boundary}\r\n".encode("utf-8"))
    body.write(f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'.encode("utf-8"))
    body.write(b"Content-Type: text/csv\r\n\r\n")
    body.write(csv_content.encode("utf-8"))
    body.write(f"\r\n--{boundary}--\r\n".encode("utf-8"))
    
    headers = {
        "Content-Type": f"multipart/form-data; boundary={boundary}"
    }
    return body.getvalue(), headers


def login(username, password):
    status, resp = make_request(
        f"{BASE_URL}/auth/login",
        method="POST",
        data={"username": username, "password": password}
    )
    assert status == 200, f"Login failed for {username}: {resp}"
    return resp["access_token"], resp.get("user", {})


def test_role_refresh_lifecycle():
    print("=" * 80)
    print("UC09 ROLE REFRESH & DYNAMIC PERMISSION SYNCHRONIZATION TEST")
    print("=" * 80)

    # ----------------------------------------------------
    # PHASE 1: Initial Baseline Check for payerviewer1
    # ----------------------------------------------------
    print("\n[PHASE 1] Initial Baseline Check for payerviewer1...")
    token_v1, user_v1 = login("payerviewer1", "payerviewer@123")
    print(f"1. Login response user object: {user_v1}")
    
    status, me_v1 = make_request(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {token_v1}"})
    print(f"2. GET /auth/me -> HTTP {status}, Role: {me_v1.get('role')}")
    
    # ----------------------------------------------------
    # PHASE 2: Admin Promotes payerviewer1 -> clinical_analyst
    # ----------------------------------------------------
    print("\n[PHASE 2] Admin logs in and updates payerviewer1 -> clinical_analyst...")
    admin_token, _ = login("admin1", "admin@123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Locate user ID of payerviewer1
    status, users_resp = make_request(f"{BASE_URL}/auth/users", headers=admin_headers)
    users = users_resp.get("users", [])
    pv_record = next((u for u in users if u["username"] == "payerviewer1"), None)
    assert pv_record is not None, "payerviewer1 not found in user list"
    pv_id = pv_record["id"]
    print(f"3. Found payerviewer1 (User ID: {pv_id}, Current DB Role: {pv_record['role']})")
    
    # Admin modifies role
    status, patch_resp = make_request(
        f"{BASE_URL}/auth/users/{pv_id}/role",
        method="PATCH",
        data={"role": "clinical_analyst"},
        headers=admin_headers
    )
    print(f"4. Admin PATCH /auth/users/{pv_id}/role -> HTTP {status}")
    assert status == 200, f"Role update failed: {patch_resp}"
    print(f"   Database updated: {patch_resp.get('user')}")

    # ----------------------------------------------------
    # PHASE 3: payerviewer1 Re-logs in and Obtains Fresh JWT
    # ----------------------------------------------------
    print("\n[PHASE 3] payerviewer1 logs in again to obtain fresh JWT...")
    fresh_token_promoted, fresh_user_promoted = login("payerviewer1", "payerviewer@123")
    print(f"5. POST /auth/login response user: {fresh_user_promoted}")
    assert fresh_user_promoted.get("role") == "clinical_analyst", "Login did not return updated role"

    # Call GET /auth/me using NEW JWT
    status, me_promoted = make_request(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {fresh_token_promoted}"})
    print(f"6. GET /auth/me with fresh JWT -> HTTP {status}, Authoritative Role: {me_promoted.get('role')}")
    assert me_promoted.get("role") == "clinical_analyst", f"Expected clinical_analyst, got {me_promoted.get('role')}"

    # Verify Prediction is now ALLOWED
    body_bytes, form_headers = build_multipart_csv("file", "test.csv", "member_id,age,gender\nM99001,55,F\n")
    pred_headers = {"Authorization": f"Bearer {fresh_token_promoted}", **form_headers}
    pred_status, _ = make_request(f"{BASE_URL}/predict/", method="POST", data=body_bytes, headers=pred_headers)
    pred_allowed = pred_status in [200, 400]
    print(f"7. Prediction Access (POST /predict/) -> {'ALLOWED' if pred_allowed else 'DENIED (403)'} (HTTP {pred_status})")
    assert pred_allowed, "Prediction should be ALLOWED for promoted clinical_analyst"

    # Verify User Management is still DENIED (403)
    admin_access_status, _ = make_request(f"{BASE_URL}/auth/users", headers={"Authorization": f"Bearer {fresh_token_promoted}"})
    print(f"8. Admin User Management Access (GET /auth/users) -> {'DENIED (403)' if admin_access_status == 403 else 'ALLOWED'} (HTTP {admin_access_status})")
    assert admin_access_status == 403, "User management must remain DENIED for non-admins"

    # ----------------------------------------------------
    # PHASE 4: Admin Downgrades payerviewer1 -> payer_viewer
    # ----------------------------------------------------
    print("\n[PHASE 4] Admin downgrades payerviewer1 back to payer_viewer...")
    status, downgrade_resp = make_request(
        f"{BASE_URL}/auth/users/{pv_id}/role",
        method="PATCH",
        data={"role": "payer_viewer"},
        headers=admin_headers
    )
    print(f"9. Admin PATCH /auth/users/{pv_id}/role -> HTTP {status}")
    assert status == 200, f"Role downgrade failed: {downgrade_resp}"

    # ----------------------------------------------------
    # PHASE 5: payerviewer1 Re-logs in and Verifies Downgrade
    # ----------------------------------------------------
    print("\n[PHASE 5] payerviewer1 logs in again after downgrade...")
    token_downgraded, user_downgraded = login("payerviewer1", "payerviewer@123")
    print(f"10. POST /auth/login response user: {user_downgraded}")
    assert user_downgraded.get("role") == "payer_viewer", "Login did not return downgraded role"

    status, me_downgraded = make_request(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {token_downgraded}"})
    print(f"11. GET /auth/me with fresh JWT -> HTTP {status}, Authoritative Role: {me_downgraded.get('role')}")
    assert me_downgraded.get("role") == "payer_viewer", f"Expected payer_viewer, got {me_downgraded.get('role')}"

    # Verify Prediction is now DENIED (403)
    pred_headers_down = {"Authorization": f"Bearer {token_downgraded}", **form_headers}
    pred_status_down, _ = make_request(f"{BASE_URL}/predict/", method="POST", data=body_bytes, headers=pred_headers_down)
    print(f"12. Prediction Access (POST /predict/) -> {'DENIED (403)' if pred_status_down == 403 else 'ALLOWED'} (HTTP {pred_status_down})")
    assert pred_status_down == 403, "Prediction must be DENIED (403) for payer_viewer"

    print("\n" + "=" * 80)
    print("ALL DYNAMIC ROLE PROMOTION AND DOWNGRADE TESTS PASSED PERFECTLY!")
    print("=" * 80)


if __name__ == "__main__":
    test_role_refresh_lifecycle()
