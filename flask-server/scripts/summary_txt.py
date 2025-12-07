import os
from datetime import datetime
import pytz  # pip install pytz

def save_summary_to_txt(actions, filename="summaries.txt", tz="America/Toronto"):
    """
    Append a timestamped summary to a text log file.
    Accepts a list of email actions from Gemini.
    Prevents appending duplicates in a row.
    """
    now = datetime.now(pytz.timezone(tz)).strftime("%Y-%m-%d %H:%M:%S %Z")

    # Build summary text
    summary_lines = []
    for item in actions:
        line = (
            f"From: {item.get('From')}\n"
            f"Subject: {item.get('Subject')}\n"
            f"Summary: {item.get('Summary')}\n"
            f"Recommended Action: {item.get('RecommendedAction')}\n"
        )
        if item.get("RecommendedAction") == "reply":
            line += f"ReplyContent: {item.get('ReplyContent')}\n"
        summary_lines.append(line)

    summary_text = "\n".join(summary_lines)

    # Prepare log entry
    entry = (
        f"\n--- {now} ---\n"
        f"Summary of important emails:\n{summary_text}"
        f"{'-'*40}\n"
    )

    # Avoid consecutive duplicates
    if os.path.exists(filename):
        with open(filename, "r", encoding="utf-8") as f:
            last_content = f.read().strip()
            if last_content.endswith(summary_text.strip()):
                return  # skip duplicate

    # Append to file
    with open(filename, "a", encoding="utf-8") as f:
        f.write(entry)
