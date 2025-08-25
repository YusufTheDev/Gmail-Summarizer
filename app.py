from gmail import (
    authenticate_gmail,
    return_unread_emails,
    mark_emails_as_read,
    send_email
)
from response import summarize_emails
from summary_txt import save_summary_to_txt

log_file = "summaries.txt"

def main():
    service = authenticate_gmail()
    filtered_messages = return_unread_emails(service)

    if not filtered_messages:
        print("No unread emails found.")
        return

    # Build a lookup from (From, Subject) to Gmail message ID
    email_id_map = {(email['From'], email['Subject']): email['id'] for email in filtered_messages}

    # Get structured summary/actions from Gemini
    important_emails = summarize_emails(filtered_messages)

    if not important_emails:
        print("No important emails found today.")
        return

    # Show summary of important emails
    print("\nSummary of important emails:\n")
    for email in important_emails:
        print(f"From: {email['From']}")
        print(f"Subject: {email['Subject']}")
        print(f"Summary: {email['Summary']}")
        print(f"Recommended Action: {email['RecommendedAction']}\n")

    # Save summary to TXT
    save_summary_to_txt(important_emails, filename=log_file)

    # Ask user to mark all important emails as read
    mark_read = input("Do you want to mark all these important emails as read? (y/n): ")
    if mark_read.lower() == 'y':
        for email in important_emails:
            key = (email['From'], email['Subject'])
            message_id = email_id_map.get(key)
            if message_id:
                mark_emails_as_read(service, message_id)
        print("All important emails marked as read.")

    # Handle replies separately
    for email in important_emails:
        if email['RecommendedAction'] == "reply":
            key = (email['From'], email['Subject'])
            message_id = email_id_map.get(key)
            print(f"\nReply suggested for email from {email['From']} | Subject: {email['Subject']}")
            suggested_reply = email.get("ReplyContent", "")
            print("AI draft:\n", suggested_reply)
            choice = input("Do you want to send this reply or edit it? (y/n/edit): ").lower()
            if choice == 'y':
                send_email(service, email['From'], f"Re: {email['Subject']}", suggested_reply)
            elif choice == 'edit':
                edited_reply = input("Edit your reply below:\n")
                send_email(service, email['From'], f"Re: {email['Subject']}", edited_reply)
            else:
                return
            print("Reply successfully sent")
            # If replying, also mark email as read if not already
            if mark_read.lower() != 'y' and message_id:
                mark_emails_as_read(service, message_id)

if __name__ == "__main__":
    main()
