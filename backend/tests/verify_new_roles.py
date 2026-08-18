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


def verify_roles():
    print("=" * 80)
    print("TESTING 4 SEPARATE ROLE ACCOUNTS ON LIVE FASTAPI SERVER")
    print("=" * 80)

    accounts = [
        ("payerviewer1", "clinical@123", "payer_viewer"), # payerviewer1 was registered with user password
        ("clinical1", "clinical@123", "clinical_analyst"),
        ("caremanager1", "caremanager@123", "care_manager"),
        ("admin1", "admin@123", "payer_admin"),
    ]

    results_table = []
    sample_csv = "member_id,age,gender\nM99001,55,F\n"

    for username, password, expected_role in accounts:
        print(f"\n--- Testing Account: {username} (Expected: {expected_role}) ---")
        
        # 1. Login
        login_status, login_resp = make_request(
            f"{BASE_URL}/auth/login",
            method="POST",
            data={"username": username, "password": password}
        )
        
        # If payerviewer1 had different password, try TestPassword123! or payerviewer@123
        if login_status != 200 and username == "payerviewer1":
            for alt_pwd in ["payerviewer@123", "TestPassword123!", "viewer@123"]:
                login_status, login_resp = make_request(
                    f"{BASE_URL}/auth/login",
                    method="POST",
                    data={"username": username, "password": alt_pwd}
                )
                if login_status == 200:
                    password = alt_pwd
                    break

        print(f"  1. Login Status: {login_status} ({'SUCCESS' if login_status == 200 else 'FAILED'})")
        assert login_status == 200, f"Login failed for {username}: {login_resp}"

        token = login_resp.get("access_token")
        auth_header = {"Authorization": f"Bearer {token}"}

        # 2. GET /auth/me
        me_status, me_resp = make_request(f"{BASE_URL}/auth/me", headers=auth_header)
        actual_role = me_resp.get("role")
        print(f"  2. /auth/me Role: {actual_role} (Expected: {expected_role})")
        assert me_status == 200 and actual_role == expected_role, f"Role mismatch: {actual_role} != {expected_role}"

        # 3. Prediction Access (POST /predict/)
        body_bytes, form_headers = build_multipart_csv("file", "test.csv", sample_csv)
        predict_headers = {**auth_header, **form_headers}
        pred_status, pred_resp = make_request(
            f"{BASE_URL}/predict/",
            method="POST",
            data=body_bytes,
            headers=predict_headers
        )
        pred_allowed = pred_status in [200, 400] # 400 means route passed RBAC dependency and hit CSV parser
        print(f"  3. Prediction Access: {'ALLOWED' if pred_allowed else 'DENIED (403)'} (HTTP {pred_status})")

        # 4. Admin Access (GET /auth/users)
        admin_status, admin_resp = make_request(f"{BASE_URL}/auth/users", headers=auth_header)
        admin_allowed = admin_status == 200
        print(f"  4. Admin User Mgmt: {'ALLOWED' if admin_allowed else 'DENIED (403)'} (HTTP {admin_status})")

        results_table.append({
            "Account": username,
            "Final Role": actual_role,
            "Login": "SUCCESS (200)",
            "/auth/me role": actual_role,
            "Prediction": "ALLOWED" if pred_allowed else "DENIED (403)",
            "Admin": "ALLOWED" if admin_allowed else "DENIED (403)",
        })

    print("\n" + "=" * 80)
    print("FINAL SUMMARY MATRIX TABLE:")
    print("=" * 80)
    print(f"{'Account':<15} | {'Final Role':<17} | {'Login':<13} | {'/auth/me role':<17} | {'Prediction':<12} | {'Admin':<12}")
    print("-" * 90)
    for r in results_table:
        print(f"{r['Account']:<15} | {r['Final Role']:<17} | {r['Login']:<13} | {r['/auth/me role']:<17} | {r['Prediction']:<12} | {r['Admin']:<12}")
    print("=" * 80)


if __name__ == "__main__":
    verify_roles()
