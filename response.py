import os
import json
import re
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

VALID_ACTIONS = {"ignore", "mark_as_read", "trash", "reply"}

def parse_gemini_json(response_text):
    """
    Try to extract valid JSON from Gemini response even if it has extra text.
    """
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        # Remove any leading/trailing non-JSON text
        match = re.search(r"(\[.*\])", response_text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError as e:
                print("⚠️ Failed to parse JSON even after cleanup:", e)
                return []
        print("⚠️ Could not find JSON in Gemini response.")
        return []

def summarize_emails(emails):
    email_text = ""
    for i, email in enumerate(emails, 1):
        email_text += f"\nEmail {i}:\nFrom: {email.get('From')}\nSubject: {email.get('Subject')}\nBody:\n{email.get('Body')}\n"

    prompt = f"""
You are an assistant that processes emails and outputs a structured JSON array.
Each element must have the keys: From, Subject, Summary, RecommendedAction, and (optional) ReplyContent.

RecommendedAction must be one of:
- "ignore" → do nothing
- "mark_as_read"
- "trash"
- "reply"

If RecommendedAction is "reply", also include "ReplyContent".

Here are today's emails (including attachments text if any):
{email_text}

Return only valid JSON. Example:

[
  {{
    "From": "professor@example.com",
    "Subject": "Assignment deadline",
    "Summary": "Deadline extended to next Friday",
    "RecommendedAction": "reply",
    "ReplyContent": "Thank you for letting me know!"
  }},
  {{
    "From": "noreply@newsletter.com",
    "Subject": "Weekly ads",
    "Summary": "Promotional newsletter",
    "RecommendedAction": "trash"
  }}
]
"""

    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(prompt)

    actions = parse_gemini_json(response.text)

    # Validate and normalize each action
    valid_actions = []
    for item in actions:
        if not isinstance(item, dict):
            continue
        action = item.get("RecommendedAction", "ignore")
        if action not in VALID_ACTIONS:
            action = "ignore"
        valid_actions.append({
            "From": item.get("From", ""),
            "Subject": item.get("Subject", ""),
            "Summary": item.get("Summary", ""),
            "RecommendedAction": action,
            "ReplyContent": item.get("ReplyContent", "")
        })

    return valid_actions
