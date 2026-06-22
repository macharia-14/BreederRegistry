# Backend/app/email_utils.py: contains backend logic for the Animal Breed Registry System. Email generation and dispatch utilities are implemented here, using SMTP configuration from environment variables. This module provides functions to send various notification emails to breeders and admins, such as new application alerts, approval/rejection notices, and password reset links.
import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "BreedRegistry <no-reply@breedregistry.co.ke>")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")

# Internal helper for send.
def _send(to: str, subject: str, html_body: str) -> None:
    """
    Internal helper — builds and dispatches a MIME email.
    Logs a warning and silently returns on failure so that a broken
    SMTP configuration never crashes a user-facing API request.
    """

    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("Email not sent — SMTP_USER / SMTP_PASSWORD not configured.")

        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, to, msg.as_string())
        logger.info("Email sent to %s: %s", to, subject)

    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to, exc)

# Internal helper for base template.
def _base_template(title: str, body_html: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <style>
        body  {  font-family: 'DM Sans', Arial, sans-serif; background:#F7F4EF; margin:0; padding:0; }
        .wrap {  max-width:600px; margin:40px auto; background:#fff;
                 border-radius:12px; overflow:hidden;
                 box-shadow:0 4px 24px rgba(0,0,0,.08); }
        .hdr  {  background:#1B4332; padding:28px 32px; }
        .hdr h1 {  color:#fff; font-size:18px; margin:0; }
        .hdr span {  color:#D4A96A; }
        .body {  padding:32px; color:#1C1C1C; line-height:1.7; }
        .body h2 {  color:#1B4332; margin-top:0; }
        .badge-ok  {  display:inline-block; background:#D1FAE5; color:#065F46;
                      padding:6px 16px; border-radius:20px; font-weight:600; font-size:14px; }
        .badge-err {  display:inline-block; background:#FEE2E2; color:#991B1B;
                      padding:6px 16px; border-radius:20px; font-weight:600; font-size:14px; }
        .btn  {  display:inline-block; margin-top:20px; padding:12px 28px;
                 background:#2D6A4F; color:#fff; border-radius:8px;
                 text-decoration:none; font-weight:600; font-size:14px; }
        .ftr  {  background:#F0D9B5; padding:16px 32px; font-size:12px; color:#6B7280;
                 text-align:center; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="hdr"><h1>🐄 <span>BreedRegistry</span> — Kenya Animal Breed Registry</h1></div>
        <div class="body">{body_html}</div>
        <div class="ftr">© 2025 Animal Breed Registry System · Kenya</div>
      </div>
    </body>
    </html>
    """

# Sends new application email to admin through the configured service.
def send_new_application_email_to_admin(
    breeder_name: str,
    breeder_email: str,
    national_id: str,
    farm_name: str,
    animal_type: str,
    county: str,

) -> None:
    """
    Notify admin inbox that a new breeder registration has been submitted
    and is awaiting review.
    """

    if not ADMIN_EMAIL:
        logger.warning("ADMIN_EMAIL not set — new-application alert not sent.")

        return

    body = f"""
    <h2>New Breeder Application Received</h2>
    <p>A new breeder has submitted a registration request and is waiting for your review.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;color:#6B7280;width:140px;">Full Name</td>
          <td style="padding:8px 0;font-weight:600;">{breeder_name}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;">Email</td>
          <td style="padding:8px 0;">{breeder_email}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;">National ID</td>
          <td style="padding:8px 0;">{national_id}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;">Farm / Business</td>
          <td style="padding:8px 0;">{farm_name or '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;">Animal Type</td>
          <td style="padding:8px 0;">{animal_type}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;">County</td>
          <td style="padding:8px 0;">{county or '—'}</td></tr>
    </table>
    <a class="btn" href="http://localhost:8000/admin/overview.html">
      Review Application →
    </a>
    """

    _send(

        to=ADMIN_EMAIL,
        subject=f"[BreedRegistry] New Application — {breeder_name}",
        html_body=_base_template("New Application", body),

    )

# Sends application approved email through the configured service.
def send_application_approved_email(
    to_email: str,
    breeder_name: str,
    farm_name: str,

) -> None:
    """Tell a breeder their registration has been approved."""

    body = f"""
    <h2>Your Application Has Been Approved! 🎉</h2>
    <p>Dear <strong>{breeder_name}</strong>,</p>
    <p>
      We are pleased to inform you that your registration for
      <strong>{farm_name}</strong> on the Kenya Animal Breed Registry
      has been <span class="badge-ok">Approved</span>.
    </p>
    <p>
      You can now log in to the portal to register your animals,
      record breeding events, and track lineage records.
    </p>
    <a class="btn" href="http://localhost:8000/login.html">Log In to Your Dashboard →</a>
    <p style="margin-top:24px;font-size:13px;color:#6B7280;">
      If you have questions, reply to this email or contact the registry office.
    </p>
    """

    _send(
        to=to_email,
        subject="[BreedRegistry] Your registration has been approved",
        html_body=_base_template("Application Approved", body),
    )

# Sends application rejected email through the configured service.
def send_application_rejected_email(
    to_email: str,
    breeder_name: str,

) -> None:
    """Tell a breeder their registration has been rejected."""

    body = f"""
    <h2>Application Status Update</h2>
    <p>Dear <strong>{breeder_name}</strong>,</p>
    <p>
      After reviewing your registration request, we regret to inform you
      that your application has been <span class="badge-err">Rejected</span>
      at this time.
    </p>
    <p>
      This may be due to incomplete documentation or information that could
      not be verified. You are welcome to re-apply with the correct details.
    </p>
    <a class="btn" href="http://localhost:8000/register.html">Re-Apply →</a>
    <p style="margin-top:24px;font-size:13px;color:#6B7280;">
      For more information about the reason for rejection, please contact
      the registry office directly.
    </p>
    """

    _send(
        to=to_email,
        subject="[BreedRegistry] Your registration application status",
        html_body=_base_template("Application Status", body),
    )

# Sends password reset email through the configured service.
def send_password_reset_email(to_email: str, breeder_name: str, reset_url: str) -> None:
    """Send a breeder password reset link."""

    body = f"""
    <h2>Password Reset Request</h2>
    <p>Dear <strong>{breeder_name}</strong>,</p>
    <p>We received a request to reset your BreedRegistry password.</p>
    <p>This link expires in 60 minutes. If you did not request this reset, ignore this message.</p>
    <a class="btn" href="{reset_url}">Reset Password →</a>
    <p style="margin-top:24px;font-size:13px;color:#6B7280;word-break:break-all;">
      Direct link: {reset_url}
    </p>
    """

    _send(
        to=to_email,
        subject="[BreedRegistry] Password reset request",
        html_body=_base_template("Password Reset", body),
    )
