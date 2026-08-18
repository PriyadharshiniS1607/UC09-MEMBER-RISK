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


def test_rbac():
    print("=" * 70)
    print("UC09 AUTHENTICATION & RBAC PERMISSION MATRIX VERIFICATION")
    print("=" * 70)

    # 1. Test Unauthenticated Request -> 401
    print("\n[1] Testing Unauthenticated Request...")
    status_code, resp = make_request(f"{BASE_URL}/members/")
    print(f"GET /members/ without token -> HTTP {status_code} ({resp.get('detail')})")
    assert status_code == 401, f"Expected 401, got {status_code}"

    # 2. Test Registration -> Default Role = payer_viewer
    import time
    reg_username = f"viewer_reg_{int(time.time())}"
    print(f"\n[2] Testing Registration of fresh user '{reg_username}'...")
    status_code, reg_resp = make_request(
        f"{BASE_URL}/auth/register",
        method="POST",
        data={
            "username": reg_username,
            "email": f"{reg_username}@example.com",
            "password": "TestPassword123!",
            "confirm_password": "TestPassword123!",
        }
    )
    print(f"POST /auth/register -> HTTP {status_code}")
    print(f"Assigned Role in Response: {reg_resp.get('user', {}).get('role')}")
    assert status_code == 200, f"Expected 200, got {status_code}"
    assert reg_resp.get("user", {}).get("role") == "payer_viewer", "Must default to payer_viewer"

    # 3. Test Matrix for all 4 Roles
    # Dedicated test users:
    role_credentials = [
        ("payer_viewer", "payer_viewer_test", "TestPassword123!"),
        ("clinical_test (viewer)", "clinical_test", "TestPassword123!"),
        ("clinical_analyst", "swetha_test", "TestPassword123!"),
        ("care_manager", "care_manager_test", "TestPassword123!"),
        ("payer_admin", "payer_admin_test", "TestPassword123!"),
    ]

    # Minimal sample CSV for prediction testing
    sample_csv = "member_id,age,gender\nM99001,55,F\n"

    print("\n" + "=" * 70)
    print("TESTING EACH ROLE INDIVIDUALLY:")
    print("=" * 70)

    for role_label, username, password in role_credentials:
        print(f"\n--- Testing Account: {username} (Expected Role: {role_label}) ---")
        
        # A. Login
        status_code, login_resp = make_request(
            f"{BASE_URL}/auth/login",
            method="POST",
            data={"username": username, "password": password}
        )
        print(f"  A. POST /auth/login -> HTTP {status_code}")
        assert status_code == 200, f"Login failed for {username}: {login_resp}"
        
        token = login_resp.get("access_token")
        auth_header = {"Authorization": f"Bearer {token}"}

        # B. GET /auth/me
        status_code, me_resp = make_request(f"{BASE_URL}/auth/me", headers=auth_header)
        actual_role = me_resp.get("role")
        print(f"  B. GET /auth/me -> HTTP {status_code}, User: {me_resp.get('username')}, Actual Role: {actual_role}")
        assert status_code == 200, f"/auth/me failed for {username}"

        # C. GET /members/ (Member access -> allowed for all)
        status_code, mem_resp = make_request(f"{BASE_URL}/members/", headers=auth_header)
        print(f"  C. GET /members/ -> HTTP {status_code} (Total: {mem_resp.get('total_members')})")
        assert status_code == 200, f"Member access failed for {actual_role}"

        # D. POST /predict/ (Prediction access)
        body_bytes, form_headers = build_multipart_csv("file", "test.csv", sample_csv)
        predict_headers = {**auth_header, **form_headers}
        status_code, pred_resp = make_request(
            f"{BASE_URL}/predict/",
            method="POST",
            data=body_bytes,
            headers=predict_headers
        )
        if actual_role in ["payer_admin", "clinical_analyst", "care_manager"]:
            print(f"  D. POST /predict/ -> HTTP {status_code} (Prediction ALLOWED as expected)")
            assert status_code in [200, 400], f"Expected prediction allowed (200/400 validation), got {status_code}"
        else:
            print(f"  D. POST /predict/ -> HTTP {status_code} ({pred_resp.get('detail')}) (Prediction DENIED as expected)")
            assert status_code == 403, f"Expected 403 for payer_viewer, got {status_code}"

        # E. GET /auth/users (Admin-only access)
        status_code, admin_resp = make_request(
            f"{BASE_URL}/auth/users",
            headers=auth_header
        )
        if actual_role == "payer_admin":
            print(f"  E. GET /auth/users -> HTTP {status_code} (Admin User Management ALLOWED as expected)")
            assert status_code == 200, f"Expected 200 for payer_admin, got {status_code}"
        else:
            print(f"  E. GET /auth/users -> HTTP {status_code} ({admin_resp.get('detail')}) (Admin User Management DENIED as expected)")
            assert status_code == 403, f"Expected 403 for {actual_role}, got {status_code}"

    print("\n" + "=" * 70)
    print("ALL RBAC TESTS PASSED SUCCESSFULLY ACCORDING TO HANDOVER SPECIFICATION!")
    print("=" * 70)


if __name__ == "__main__":
    test_rbac()
