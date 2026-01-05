from flask import Flask, redirect, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
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
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
CORS(app, supports_credentials=True, origins=["http://localhost:3000"])

# --- Database Models ---
class UsageLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_email = db.Column(db.String(120), nullable=True) # Optional if we don't strictly track by email yet
    emails_processed = db.Column(db.Integer, default=0)
    time_saved_minutes = db.Column(db.Float, default=0.0)
    date = db.Column(db.DateTime, default=datetime.utcnow)

# Create tables within app context
with app.app_context():
    db.create_all()

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
    print("Received summarize request")
    state = request.args.get("state")
    if not state or state not in active_sessions or not active_sessions[state]:
        print("User not logged in or session invalid")
        return jsonify({"error": "User not logged in"}), 401

    credentials = google_credentials_from_dict(active_sessions[state])
    service = build("gmail", "v1", credentials=credentials)

    filtered_messages = return_unread_emails(service)
    if not filtered_messages:
        return jsonify({"summary": "No unread emails found."})

    try:
        important_emails, global_summary = summarize_emails(filtered_messages)
        save_summary_to_txt(important_emails, filename="summaries.txt")

        return jsonify({
            "emails": important_emails,
            "global_summary": global_summary
        })
    except Exception as e:
        print(f"Error during summarization: {e}")
        return jsonify({"error": f"Summarization failed: {str(e)}"}), 500



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


# --- New Stats Endpoints ---

@app.route("/api/log_usage", methods=["POST"])
def log_usage():
    data = request.json
    emails_processed = data.get("emails_processed", 0)
    
    # Simple heuristic: 2 minutes saved per email summarized
    time_saved = emails_processed * 2.0 
    
    new_log = UsageLog(
        emails_processed=emails_processed,
        time_saved_minutes=time_saved,
        date=datetime.utcnow()
    )
    
    try:
        db.session.add(new_log)
        db.session.commit()
        return jsonify({"success": True, "time_saved": time_saved})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/stats", methods=["GET"])
def get_stats():
    # Calculate total time saved
    total_saved = db.session.query(db.func.sum(UsageLog.time_saved_minutes)).scalar() or 0
    total_emails = db.session.query(db.func.sum(UsageLog.emails_processed)).scalar() or 0
    
    # Get last 7 days breakdown
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=7)
    
    # SQLite logic might vary for dates, but this is standard SQLAlchemy
    logs = UsageLog.query.filter(UsageLog.date >= start_date).all()
    
    # Process logs into days
    daily_stats = {}
    for i in range(7):
        day = (end_date - timedelta(days=i)).strftime("%Y-%m-%d")
        daily_stats[day] = 0
        
    for log in logs:
        day_str = log.date.strftime("%Y-%m-%d")
        if day_str in daily_stats:
            daily_stats[day_str] += log.time_saved_minutes
            
    # Format for graph (oldest to newest)
    sorted_days = sorted(daily_stats.keys())
    graph_data = {
        "x": sorted_days,
        "y": [daily_stats[day] for day in sorted_days]
    }
    
    return jsonify({
        "total_time_saved_minutes": total_saved,
        "total_emails_processed": total_emails,
        "graph_data": graph_data,
        "productivity_score": int(total_saved * 1.5) # Arbitrary score logic
    })


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

