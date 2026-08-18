from __future__ import annotations

import os
import smtplib
from email.message import EmailMessage
from typing import Any

from dotenv import load_dotenv


load_dotenv()


SMTP_HOST = os.getenv(
    "SMTP_HOST",
    "smtp.gmail.com",
)

SMTP_PORT = int(
    os.getenv(
        "SMTP_PORT",
        "587",
    )
)

SMTP_USERNAME = os.getenv(
    "SMTP_USERNAME",
)

SMTP_PASSWORD = os.getenv(
    "SMTP_PASSWORD",
)

PAYER_VIEWER_EMAIL = os.getenv(
    "PAYER_VIEWER_EMAIL",
)


# ============================================================
# CONFIGURATION
# ============================================================

def validate_email_configuration() -> None:
    missing = []

    if not SMTP_USERNAME:
        missing.append("SMTP_USERNAME")

    if not SMTP_PASSWORD:
        missing.append("SMTP_PASSWORD")

    if not PAYER_VIEWER_EMAIL:
        missing.append("PAYER_VIEWER_EMAIL")

    if missing:
        raise RuntimeError(
            "Email configuration is incomplete. "
            f"Missing environment variables: "
            f"{', '.join(missing)}"
        )


# ============================================================
# EMAIL SERVICE
# ============================================================

class EmailService:
    """
    Central email service for UC09 Member Risk.

    Payer Viewer receives intervention notifications.
    """

    @staticmethod
    def send_email(
        recipient: str,
        subject: str,
        body: str,
    ) -> bool:
        """
        Send a generic email.
        """

        validate_email_configuration()

        message = EmailMessage()

        message["Subject"] = subject
        message["From"] = SMTP_USERNAME
        message["To"] = recipient

        message.set_content(body)

        try:

            with smtplib.SMTP(
                SMTP_HOST,
                SMTP_PORT,
                timeout=30,
            ) as server:

                server.ehlo()

                server.starttls()

                server.ehlo()

                server.login(
                    SMTP_USERNAME,
                    SMTP_PASSWORD,
                )

                server.send_message(
                    message
                )

            return True

        except smtplib.SMTPAuthenticationError as exc:

            raise RuntimeError(
                "SMTP authentication failed. "
                "Check your Gmail username and "
                "App Password."
            ) from exc

        except smtplib.SMTPException as exc:

            raise RuntimeError(
                f"SMTP email sending failed: {exc}"
            ) from exc

        except OSError as exc:

            raise RuntimeError(
                f"Could not connect to SMTP server "
                f"{SMTP_HOST}:{SMTP_PORT}: {exc}"
            ) from exc

    # ========================================================
    # INTERVENTION EMAIL
    # ========================================================

    @staticmethod
    def send_intervention_email(
        intervention: dict[str, Any],
    ) -> bool:
        """
        Send a newly-created intervention notification
        to the configured Payer Viewer.
        """

        validate_email_configuration()

        member_id = intervention.get(
            "member_id",
            "Unknown",
        )

        intervention_id = intervention.get(
            "intervention_id",
            "N/A",
        )

        risk_summary = intervention.get(
            "risk_summary",
            {},
        )

        if not isinstance(
            risk_summary,
            dict,
        ):
            risk_summary = {}

        recommendations = intervention.get(
            "recommendations",
            [],
        )

        if not isinstance(
            recommendations,
            list,
        ):
            recommendations = []

        risk_score = risk_summary.get(
            "risk_score",
            "N/A",
        )

        risk_category = risk_summary.get(
            "risk_category",
            "N/A",
        )

        summary = risk_summary.get(
            "summary",
            "",
        )

        subject = (
            "New Member Intervention - "
            f"{member_id} - "
            f"{risk_category} Risk"
        )

        lines = [
            "New Member Intervention Notification",
            "=" * 60,
            "",
            f"Member ID: {member_id}",
            f"Intervention ID: {intervention_id}",
            f"Risk Score: {risk_score}",
            f"Risk Category: {risk_category}",
        ]

        if summary:
            lines.extend(
                [
                    "",
                    "Risk Summary:",
                    summary,
                ]
            )

        lines.extend(
            [
                "",
                "Intervention Recommendations:",
                "-" * 60,
            ]
        )

        if not recommendations:

            lines.append(
                "No recommendations are currently available."
            )

        else:

            for index, recommendation in enumerate(
                recommendations,
                start=1,
            ):

                if not isinstance(
                    recommendation,
                    dict,
                ):
                    continue

                priority = recommendation.get(
                    "priority",
                    "N/A",
                )

                feature = recommendation.get(
                    "feature",
                    "N/A",
                )

                concept = recommendation.get(
                    "concept",
                    "N/A",
                )

                rationale = recommendation.get(
                    "rationale",
                    "",
                )

                recommended_action = recommendation.get(
                    "recommended_action",
                    "",
                )

                next_step = recommendation.get(
                    "next_step",
                    "",
                )

                lines.append(
                    f"{index}. Priority: {priority}"
                )

                lines.append(
                    f"   Feature: {feature}"
                )

                lines.append(
                    f"   Concept: {concept}"
                )

                if rationale:
                    lines.append(
                        f"   Rationale: {rationale}"
                    )

                if recommended_action:
                    lines.append(
                        "   Recommended Action: "
                        f"{recommended_action}"
                    )

                if next_step:
                    lines.append(
                        f"   Next Step: {next_step}"
                    )

                lines.append("")

        lines.extend(
            [
                "-" * 60,
                "",
                "This notification was generated from "
                "the member intervention workflow.",
                "",
                "Please review the intervention details "
                "in the dashboard.",
                "",
                "This email is intended for the authorized "
                "Payer Viewer.",
            ]
        )

        body = "\n".join(lines)

        return EmailService.send_email(
            recipient=PAYER_VIEWER_EMAIL,
            subject=subject,
            body=body,
        )

    # ========================================================
    # TEST EMAIL
    # ========================================================

    @staticmethod
    def send_test_email() -> bool:
        """
        Send a simple SMTP test email.
        """

        return EmailService.send_email(
            recipient=PAYER_VIEWER_EMAIL,
            subject="UC09 Member Risk - SMTP Test",
            body=(
                "This is a test email from the "
                "UC09 Member Risk intervention service.\n\n"
                "If you received this message, Gmail SMTP "
                "configuration is working correctly."
            ),
        )

    # ========================================================
    # COMPATIBILITY METHODS
    # ========================================================

    @staticmethod
    def send_clinical_risk_alert(
        recipient: str,
        subject: str,
        body: str,
    ) -> bool:
        """
        Compatibility method for existing tests/callers.
        """

        return EmailService.send_email(
            recipient=recipient,
            subject=subject,
            body=body,
        )

    @staticmethod
    def send_intervention_reminder(
        recipient: str,
        subject: str,
        body: str,
    ) -> bool:
        """
        Compatibility method for existing tests/callers.
        """

        return EmailService.send_email(
            recipient=recipient,
            subject=subject,
            body=body,
        )

    @staticmethod
    def send_weekly_cohort_digest(
        recipient: str,
        subject: str,
        body: str,
    ) -> bool:
        """
        Compatibility method for existing tests/callers.
        """

        return EmailService.send_email(
            recipient=recipient,
            subject=subject,
            body=body,
        )


# ============================================================
# FUNCTION COMPATIBILITY
# ============================================================

def send_intervention_email(
    intervention: dict[str, Any],
) -> bool:
    """
    Function wrapper used by intervention_service.py.
    """

    return EmailService.send_intervention_email(
        intervention
    )


def send_test_email() -> bool:
    """
    Function wrapper for direct SMTP testing.
    """

    return EmailService.send_test_email()


# ============================================================
# DIRECT TEST
# ============================================================

if __name__ == "__main__":

    print(
        "Testing Gmail SMTP configuration..."
    )

    print(
        f"SMTP host: {SMTP_HOST}"
    )

    print(
        f"SMTP port: {SMTP_PORT}"
    )

    print(
        f"SMTP username: {SMTP_USERNAME}"
    )

    print(
        f"Payer Viewer email: {PAYER_VIEWER_EMAIL}"
    )

    EmailService.send_test_email()

    print(
        "Test email sent successfully."
    )