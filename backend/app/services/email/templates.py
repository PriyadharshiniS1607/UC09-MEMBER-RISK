# HTML and Plaintext Email Templates for clinical notifications

# Common CSS styles for premium look & feel
BASE_CSS = """
body {
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    background-color: #f8fafc;
    color: #1e293b;
    margin: 0;
    padding: 0;
    -webkit-font-smoothing: antialiased;
}
.wrapper {
    background-color: #f8fafc;
    padding: 30px 15px;
}
.container {
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
    border: 1px solid #e2e8f0;
}
.header {
    background-color: #0f172a; /* Slate 900 */
    padding: 28px 32px;
    border-bottom: 4px solid #0d9488; /* Teal 600 */
}
.header-logo {
    font-size: 12px;
    font-weight: 800;
    color: #0d9488;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 6px;
}
.header h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -0.025em;
}
.content {
    padding: 32px;
}
.card {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 24px;
}
.card-title {
    font-size: 12px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 0;
    margin-bottom: 12px;
}
.risk-badge {
    display: inline-block;
    padding: 6px 12px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.025em;
}
.risk-VeryHigh {
    background-color: #fee2e2;
    color: #991b1b;
    border: 1px solid #fca5a5;
}
.risk-High {
    background-color: #ffedd5;
    color: #c2410c;
    border: 1px solid #fed7aa;
}
.risk-Medium {
    background-color: #fef9c3;
    color: #854d0e;
    border: 1px solid #fef08a;
}
.risk-Low {
    background-color: #dcfce7;
    color: #166534;
    border: 1px solid #bbf7d0;
}
.table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 16px;
}
.table th {
    text-align: left;
    padding: 10px 12px;
    border-bottom: 2px solid #e2e8f0;
    font-size: 11px;
    font-weight: 700;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}
.table td {
    padding: 12px;
    border-bottom: 1px solid #f1f5f9;
    font-size: 13px;
    color: #334155;
    vertical-align: top;
}
.driver-bar-bg {
    background-color: #e2e8f0;
    border-radius: 9999px;
    height: 6px;
    width: 80px;
    display: inline-block;
    vertical-align: middle;
    margin-right: 8px;
    overflow: hidden;
}
.driver-bar-fill {
    background-color: #0d9488;
    height: 100%;
    border-radius: 9999px;
}
.driver-bar-fill-high {
    background-color: #f43f5e;
}
.btn {
    display: inline-block;
    background-color: #0d9488;
    color: #ffffff !important;
    text-decoration: none;
    padding: 12px 24px;
    font-size: 13px;
    font-weight: 600;
    border-radius: 8px;
    text-align: center;
    box-shadow: 0 4px 6px -1px rgba(13, 148, 136, 0.2);
    transition: background-color 0.2s;
}
.footer {
    background-color: #f1f5f9;
    padding: 24px 32px;
    border-top: 1px solid #e2e8f0;
    text-align: center;
    font-size: 11px;
    color: #64748b;
    line-height: 1.6;
}
.divider {
    height: 1px;
    background-color: #e2e8f0;
    margin: 24px 0;
}
.grid {
    display: table;
    width: 100%;
}
.grid-col {
    display: table-cell;
    width: 50%;
    vertical-align: top;
}
"""

# 1. Clinical Risk Alert Template
CLINICAL_RISK_ALERT_HTML = """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>High Risk Level Alert</title>
    <style>
        """ + BASE_CSS + """
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <div class="header-logo">Clinical Decision Support</div>
                <h1>Elevated Health Risk Alert</h1>
            </div>
            <div class="content">
                <p style="margin-top:0; font-size:15px; line-height:1.5; color:#334155;">
                    Hello <strong>{{ provider_name }}</strong>,
                </p>
                <p style="font-size:14px; line-height:1.5; color:#475569; margin-bottom: 24px;">
                    This notification has been triggered because a patient in your care panel has been scored with an elevated health risk index based on recent clinical and Social Determinants of Health (SDOH) updates.
                </p>

                <!-- Patient Profile Card -->
                <div class="card">
                    <div class="card-title">Patient Profile</div>
                    <div class="grid">
                        <div class="grid-col" style="padding-right: 10px;">
                            <div style="font-size:15px; font-weight:700; color:#0f172a; margin-bottom:4px;">{{ member_name }}</div>
                            <div style="font-size:12px; color:#64748b;">Code: <strong>{{ member_code }}</strong></div>
                            <div style="font-size:12px; color:#64748b; margin-top:2px;">Age/Gender: {{ age }} / {{ gender }}</div>
                        </div>
                        <div class="grid-col" style="text-align: right;">
                            <div style="margin-bottom:8px;">
                                <span class="risk-badge risk-{{ risk_level|replace(" ", "") }}">{{ risk_level }} Risk</span>
                            </div>
                            <div style="font-size:12px; color:#64748b;">Overall Risk Score</div>
                            <div style="font-size:20px; font-weight:800; color:#0f172a; margin-top:2px;">{{ overall_score }}/100</div>
                        </div>
                    </div>
                </div>

                <!-- Risk Drivers Section -->
                <h3 style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; margin-bottom: 8px;">
                    Key Risk Contributors (SHAP Drivers)
                </h3>
                <p style="font-size:12px; color:#64748b; margin-top:0; margin-bottom: 12px;">
                    These top factors are contributing most to the elevated risk score:
                </p>
                
                <table class="table">
                    <thead>
                        <tr>
                            <th>Feature Driver</th>
                            <th>Value</th>
                            <th>Impact Weight</th>
                        </tr>
                    </thead>
                    <tbody>
                        {% for driver in shap_drivers %}
                        <tr>
                            <td style="font-weight: 600; color:#1e293b;">
                                {{ driver.feature }}
                                {% if driver.description %}
                                <div style="font-size: 11px; font-weight: normal; color:#64748b; margin-top:2px;">
                                    {{ driver.description }}
                                </div>
                                {% endif %}
                            </td>
                            <td>{{ driver.value }}</td>
                            <td style="white-space: nowrap;">
                                <div class="driver-bar-bg">
                                    <div class="driver-bar-fill {% if driver.shap_value > 5 %}driver-bar-fill-high{% endif %}" style="width: {{ driver.shap_value * 8 }}px; max-width:80px;"></div>
                                </div>
                                <span style="font-family: monospace; font-size:12px; font-weight: 600;">+{{ driver.shap_value }}</span>
                            </td>
                        </tr>
                        {% endfor %}
                    </tbody>
                </table>

                <div class="divider"></div>

                <div style="text-align: center; margin-top: 24px;">
                    <a href="{{ portal_url }}/members/{{ member_id }}" class="btn">Access Patient Care Profile</a>
                </div>
            </div>
            <div class="footer">
                <strong>Confidential Clinical Record Notification</strong><br>
                This email contains protected health information (PHI) and is intended solely for approved clinical users. Please do not forward or expose this data.
                <br><br>
                &copy; {{ current_year }} HealthFirst Member Risk Analytics.
            </div>
        </div>
    </div>
</body>
</html>
"""

CLINICAL_RISK_ALERT_TEXT = """ELEVATED RISK LEVEL ALERT
--------------------------------------------------
Hello {{ provider_name }},

A patient under your panel, {{ member_name }} (Code: {{ member_code }}), has been classified as {{ risk_level }} Risk with an overall risk score of {{ overall_score }}/100.

Patient Demographic details:
- Age: {{ age }}
- Gender: {{ gender }}

Top Risk Drivers:
{% for driver in shap_drivers -%}
* {{ driver.feature }} (Value: {{ driver.value }}): Impact +{{ driver.shap_value }}
{% endfor %}

Please log in to the portal to access the complete member profile and intervene:
{{ portal_url }}/members/{{ member_id }}

--------------------------------------------------
CONFIDENTIAL CLINICAL RECORD - PROTECTED HEALTH INFORMATION
"""


# 2. Intervention Reminder Template
INTERVENTION_REMINDER_HTML = """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Care Intervention Due Reminder</title>
    <style>
        """ + BASE_CSS + """
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header" style="border-bottom: 4px solid #d97706; /* Amber 600 */">
                <div class="header-logo">Care Management Workflow</div>
                <h1>Care Intervention Reminder</h1>
            </div>
            <div class="content">
                <p style="margin-top:0; font-size:15px; line-height:1.5; color:#334155;">
                    Hello <strong>{{ coordinator_name }}</strong>,
                </p>
                <p style="font-size:14px; line-height:1.5; color:#475569; margin-bottom: 24px;">
                    This is a reminder that an active healthcare or social intervention is pending/overdue for a member in your dashboard.
                </p>

                <!-- Intervention Card -->
                <div class="card" style="border-left: 4px solid #d97706;">
                    <div class="card-title">Intervention Details</div>
                    <div style="font-size:16px; font-weight:700; color:#0f172a; margin-bottom:8px;">{{ intervention_title }}</div>
                    
                    <table style="width:100%; border-collapse: collapse; margin-top: 12px; font-size: 13px;">
                        <tr>
                            <td style="padding: 6px 0; font-weight: 600; color:#64748b; width: 35%;">Member Name:</td>
                            <td style="padding: 6px 0; color:#0f172a;"><strong>{{ member_name }}</strong> ({{ member_code }})</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-weight: 600; color:#64748b;">Category:</td>
                            <td style="padding: 6px 0; color:#0f172a;">{{ category }}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-weight: 600; color:#64748b;">Due Date:</td>
                            <td style="padding: 6px 0; color:#e11d48; font-weight: 700;">{{ due_date }}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-weight: 600; color:#64748b;">Priority:</td>
                            <td style="padding: 6px 0;">
                                <span style="font-weight: 700; color: {% if priority == 'High' or priority == 'Critical' %}#e11d48{% else %}#d97706{% endif %};">
                                    {{ priority }}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-weight: 600; color:#64748b; vertical-align: top;">Description:</td>
                            <td style="padding: 6px 0; color:#475569; line-height: 1.4;">{{ description }}</td>
                        </tr>
                    </table>
                </div>

                <div class="divider"></div>

                <div style="text-align: center; margin-top: 24px;">
                    <a href="{{ portal_url }}/interventions" class="btn" style="background-color: #d97706; box-shadow: 0 4px 6px -1px rgba(217, 119, 6, 0.2);">Manage Interventions</a>
                </div>
            </div>
            <div class="footer">
                <strong>Confidential Healthcare Communication</strong><br>
                Please ensure patient clinical actions are updated in the care coordination portal.
                <br><br>
                &copy; {{ current_year }} HealthFirst Member Risk Analytics.
            </div>
        </div>
    </div>
</body>
</html>
"""

INTERVENTION_REMINDER_TEXT = """CARE INTERVENTION DUE REMINDER
--------------------------------------------------
Hello {{ coordinator_name }},

This is a reminder that an intervention is pending or overdue for {{ member_name }}.

Intervention Details:
- Title: {{ intervention_title }}
- Category: {{ category }}
- Priority: {{ priority }}
- Due Date: {{ due_date }}
- Description: {{ description }}

Please visit the portal to complete and update this record:
{{ portal_url }}/interventions

--------------------------------------------------
CONFIDENTIAL CLINICAL RECORD - PROTECTED HEALTH INFORMATION
"""


# 3. Weekly Cohort Digest Template
WEEKLY_COHORT_DIGEST_HTML = """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Member Cohort Digest</title>
    <style>
        """ + BASE_CSS + """
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <div class="header-logo">Analytics Cohort Digest</div>
                <h1>Risk Panel Weekly Summary</h1>
            </div>
            <div class="content">
                <p style="margin-top:0; font-size:15px; line-height:1.5; color:#334155;">
                    Hello <strong>{{ coordinator_name }}</strong>,
                </p>
                <p style="font-size:14px; line-height:1.5; color:#475569;">
                    Here is your weekly summary of the social determinants of health (SDOH) and clinical risk indicators for your member panel.
                </p>

                <!-- Population Stat Grid -->
                <div class="card" style="padding: 16px;">
                    <div class="card-title">Panel Statistics</div>
                    <table style="width:100%; border-collapse: collapse; text-align: center;">
                        <tr>
                            <td style="width: 25%; padding: 8px 4px; border-right: 1px solid #e2e8f0;">
                                <div style="font-size: 20px; font-weight: 800; color: #0f172a;">{{ total_members }}</div>
                                <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight:600; margin-top:2px;">Members</div>
                            </td>
                            <td style="width: 25%; padding: 8px 4px; border-right: 1px solid #e2e8f0;">
                                <div style="font-size: 20px; font-weight: 800; color: #b91c1c;">{{ very_high_count }}</div>
                                <div style="font-size: 10px; color: #ef4444; text-transform: uppercase; font-weight:600; margin-top:2px;">Very High</div>
                            </td>
                            <td style="width: 25%; padding: 8px 4px; border-right: 1px solid #e2e8f0;">
                                <div style="font-size: 20px; font-weight: 800; color: #c2410c;">{{ high_count }}</div>
                                <div style="font-size: 10px; color: #f97316; text-transform: uppercase; font-weight:600; margin-top:2px;">High Risk</div>
                            </td>
                            <td style="width: 25%; padding: 8px 4px;">
                                <div style="font-size: 20px; font-weight: 800; color: #0d9488;">{{ active_interventions }}</div>
                                <div style="font-size: 10px; color: #0d9488; text-transform: uppercase; font-weight:600; margin-top:2px;">Active Tasks</div>
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- Flagged Members Table -->
                <h3 style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; margin-bottom: 8px;">
                    Members Flagged for Immediate Action
                </h3>
                <p style="font-size:12px; color:#64748b; margin-top:0; margin-bottom: 12px;">
                    These individuals have experienced the largest risk index shifts:
                </p>

                <table class="table">
                    <thead>
                        <tr>
                            <th>Member</th>
                            <th>Overall Score</th>
                            <th>Risk Level</th>
                            <th>Top SDOH Barrier</th>
                        </tr>
                    </thead>
                    <tbody>
                        {% for member in flagged_members %}
                        <tr>
                            <td>
                                <div style="font-weight: 700; color:#0f172a;">{{ member.name }}</div>
                                <div style="font-size: 11px; color:#64748b; margin-top:1px;">Code: {{ member.code }}</div>
                            </td>
                            <td style="font-weight: 600; font-size:14px; text-align: center;">{{ member.score }}/100</td>
                            <td>
                                <span class="risk-badge risk-{{ member.level|replace(" ", "") }}" style="padding: 2px 6px; font-size:10px;">
                                    {{ member.level }}
                                </span>
                            </td>
                            <td style="font-size: 11px; color: #475569;">{{ member.barrier }}</td>
                        </tr>
                        {% endfor %}
                    </tbody>
                </table>

                <div class="divider"></div>

                <div style="text-align: center; margin-top: 24px;">
                    <a href="{{ portal_url }}/dashboard" class="btn">Open Risk Analytics Dashboard</a>
                </div>
            </div>
            <div class="footer">
                <strong>Confidential Analytical digest Report</strong><br>
                For clinical staff and health planners' use only. Contains aggregate and member-specific clinical markers.
                <br><br>
                &copy; {{ current_year }} HealthFirst Member Risk Analytics.
            </div>
        </div>
    </div>
</body>
</html>
"""

WEEKLY_COHORT_DIGEST_TEXT = """MEMBER RISK COHORT WEEKLY DIGEST
--------------------------------------------------
Hello {{ coordinator_name }},

Here is your panel digest.

Summary Statistics:
- Total Members under panel: {{ total_members }}
- Very High Risk: {{ very_high_count }}
- High Risk: {{ high_count }}
- Active Interventions: {{ active_interventions }}

Flagged Members for Action:
{% for member in flagged_members -%}
* {{ member.name }} (Code: {{ member.code }}) - Score: {{ member.score }}/100 - Risk: {{ member.level }} - SDOH Barrier: {{ member.barrier }}
{% endfor %}

Open the dashboard portal to manage clinical cohorts:
{{ portal_url }}/dashboard

--------------------------------------------------
CONFIDENTIAL CLINICAL RECORD - PROTECTED HEALTH INFORMATION
"""
