from flask import Flask, redirect, request, jsonify
from flask_cors import CORS
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import os
import pathlib
import json
from scripts.gmail import return_unread_emails, mark_emails_as_read, trash_email, send_email
from scripts.response import summarize_emails
from scripts.summary_txt import save_summary_to_txt

os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

app = Flask(__name__)
app.secret_key = "super_secret_key_for_local_dev"

CORS(app, supports_credentials=True, origins=["http://localhost:3000"])

GOOGLE_CLIENT_SECRETS_FILE = os.path.join(pathlib.Path(__file__).parent, "credentials.json")
# We list both because if the user previously granted readonly, Google returns both.
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.modify"]
REDIRECT_URI = "http://localhost:5000/callback"

# Simple memory store for state/credentials
active_sessions = {}

@app.route("/login")
def login():
    flow = Flow.from_client_secrets_file(
        GOOGLE_CLIENT_SECRETS_FILE,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI
    )
    auth_url, state = flow.authorization_url(
        access_type="offline", include_granted_scopes="true"
    )
    active_sessions[state] = None  # Reserve this state
    return redirect(auth_url)

@app.route("/callback")
def callback():
    state = request.args.get("state")
    if not state or state not in active_sessions:
        return "Error: OAuth state invalid or missing", 400

    flow = Flow.from_client_secrets_file(
        GOOGLE_CLIENT_SECRETS_FILE,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
        state=state
    )
    flow.fetch_token(authorization_response=request.url)
    credentials = flow.credentials

    # Save credentials in memory (or a file if needed)
    active_sessions[state] = credentials_to_dict(credentials)

    # Redirect back to React app
    return redirect(f"http://localhost:3000?logged_in=true&state={state}")

@app.route("/summarize")
def summarize():
    state = request.args.get("state")
    if not state or state not in active_sessions or not active_sessions[state]:
        return jsonify({"error": "User not logged in"}), 401

    credentials = google_credentials_from_dict(active_sessions[state])
    service = build("gmail", "v1", credentials=credentials)

    filtered_messages = return_unread_emails(service)
    if not filtered_messages:
        return jsonify({"summary": "No unread emails found."})

    important_emails, global_summary = summarize_emails(filtered_messages)
    save_summary_to_txt(important_emails, filename="summaries.txt")

    return jsonify({
        "emails": important_emails,
        "global_summary": global_summary
    })


@app.route("/action/trash", methods=["POST"])
def trash_action():
    state = request.args.get("state")
    if not state or state not in active_sessions:
        return jsonify({"error": "User not logged in"}), 401

    data = request.json
    email_id = data.get("id")
    if not email_id:
        return jsonify({"error": "Missing email ID"}), 400

    credentials = google_credentials_from_dict(active_sessions[state])
    service = build("gmail", "v1", credentials=credentials)
    
    try:
        trash_email(service, email_id)
        return jsonify({"success": True, "message": "Email moved to trash"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/action/mark_read", methods=["POST"])
def mark_read_action():
    state = request.args.get("state")
    if not state or state not in active_sessions:
        return jsonify({"error": "User not logged in"}), 401

    data = request.json
    email_id = data.get("id")
    if not email_id:
        return jsonify({"error": "Missing email ID"}), 400

    credentials = google_credentials_from_dict(active_sessions[state])
    service = build("gmail", "v1", credentials=credentials)
    
    try:
        mark_emails_as_read(service, email_id)
        return jsonify({"success": True, "message": "Email marked as read"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/action/mark_all_read", methods=["POST"])
def mark_all_read_action():
    state = request.args.get("state")
    if not state or state not in active_sessions:
        return jsonify({"error": "User not logged in"}), 401

    data = request.json
    email_ids = data.get("ids", [])
    if not email_ids:
        return jsonify({"error": "Missing email IDs"}), 400

    credentials = google_credentials_from_dict(active_sessions[state])
    service = build("gmail", "v1", credentials=credentials)
    
    try:
        from scripts.gmail import mark_batch_as_read
        mark_batch_as_read(service, email_ids)
        return jsonify({"success": True, "message": "All emails marked as read"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/action/reply", methods=["POST"])
def reply_action():
    state = request.args.get("state")
    if not state or state not in active_sessions:
        return jsonify({"error": "User not logged in"}), 401

    data = request.json
    to = data.get("to")
    subject = data.get("subject")
    body = data.get("body")
    
    if not to or not body:
        return jsonify({"error": "Missing 'to' or 'body' fields"}), 400

    credentials = google_credentials_from_dict(active_sessions[state])
    service = build("gmail", "v1", credentials=credentials)
    
    try:
        send_email(service, to, subject or "No Subject", body)
        return jsonify({"success": True, "message": "Reply sent successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500



def credentials_to_dict(credentials):
    return {
        "token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "scopes": credentials.scopes
    }


def google_credentials_from_dict(creds_dict):
    from google.oauth2.credentials import Credentials
    return Credentials(
        creds_dict["token"],
        refresh_token=creds_dict.get("refresh_token"),
        token_uri=creds_dict["token_uri"],
        client_id=creds_dict["client_id"],
        client_secret=creds_dict["client_secret"],
        scopes=creds_dict["scopes"]
    )


@app.route("/")
def home():
    return {"message": "Flask backend running!"}


if __name__ == "__main__":
    app.run(port=5000, debug=True)
