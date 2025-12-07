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
    Supports both arrays [] and objects {}.
    """
    # 1. Try cleaning markdown code blocks first
    text = re.sub(r"```json\s*", "", response_text, flags=re.IGNORECASE)
    text = re.sub(r"```\s*", "", text)
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 2. Try finding a JSON object or array via regex
    # Match outermost { ... } or [ ... ]
    match = re.search(r"(\{.*\}|\[.*\])", response_text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError as e:
            print("⚠️ Failed to parse extracted JSON:", e)
    
    print("⚠️ Could not find JSON in Gemini response.")
    return []

def summarize_emails(emails):
    email_text = ""
    for i, email in enumerate(emails, 1):
        # We include the ID in the prompt so Gemini explicitly returns it, 
        # ensuring we don't lose the reference.
        email_text += f"\nEmail {i} [ID: {email.get('id')}]:\nFrom: {email.get('From')}\nSubject: {email.get('Subject')}\nBody:\n{email.get('Body')}\n"

    prompt = f"""
You are an intelligent email assistant. Process the following emails.

Output a JSON object with two keys:
1. "GlobalBriefing": A single, short paragraph (max 3 sentences) summarizing specific important highlights from the emails. Do not be generic. Mention specific senders or topics if urgent.
2. "EmailActions": An array of objects for each email.

Each element in "EmailActions" MUST have the keys: "id", "From", "Subject", "Summary", "RecommendedAction", and (optional) "ReplyContent".

CRITICAL RULES for "EmailActions":
1. "id" MUST match the exact ID provided in the input.
2. RecommendedAction MUST be strictly one of:
   - "mark_as_read": ONLY for truly important notifications like receipts, security alerts, or personal updates that don't need a reply.
   - "trash": IMPERATIVE. Move ALL specific types of emails to trash:
     * Marketing/Promotions (even '5 free credits' or 'allowance' or 'sales').
     * Newsletters causing clutter.
     * Automated notifications that add no value.
     * Social media updates.
   - "reply": If the email requires a response.
   * DO NOT USE "ignore" or "no action". Every email must be categorized.
3. If RecommendedAction is "reply", you must provide a professional "ReplyContent" draft.

Here are the emails:
{email_text}

Return only valid JSON. Example:
{{
  "GlobalBriefing": "You have a deadline request from Dr. Smith and a security alert from Google. Everything else is promotional junk.",
  "EmailActions": [
      {{
        "id": "18e45...",
        "From": "sender@example.com",
        "Subject": "Hello",
        "Summary": "Brief summary",
        "RecommendedAction": "reply",
        "ReplyContent": "Hi, thanks for reaching out..."
      }}
  ]
}}
"""

    model = genai.GenerativeModel("models/gemini-2.5-flash")
    response = model.generate_content(prompt)

    parsed_response = parse_gemini_json(response.text)
    
    # Handle case where AI might return list directly (fallback)
    if isinstance(parsed_response, list):
        actions = parsed_response
        global_summary = "Check your inbox for details."
    else:
        actions = parsed_response.get("EmailActions", [])
        global_summary = parsed_response.get("GlobalBriefing", "No summary available.")

    # Create a lookup for original bodies to preserve them
    body_map = {e.get('id'): e for e in emails}

    # Validate and normalize each action
    final_actions = []
    for item in actions:
        if not isinstance(item, dict):
            continue
        
        # Enforce strict actions fallback
        action = item.get("RecommendedAction", "mark_as_read")
        if action not in {"mark_as_read", "trash", "reply"}:
            action = "mark_as_read" 
            
        final_actions.append({
            "id": item.get("id"), 
            "From": item.get("From", ""),
            "Subject": item.get("Subject", ""),
            "Summary": item.get("Summary", ""),
            "Summary": item.get("Summary", ""),
            "Body": body_map.get(item.get("id"), {}).get("Body", ""), 
            "BodyHtml": body_map.get(item.get("id"), {}).get("BodyHtml", ""),
            "RecommendedAction": action,
            "ReplyContent": item.get("ReplyContent", "")
        })

    return final_actions, global_summary
