import os
import base64
from email import message_from_bytes
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from PyPDF2 import PdfReader
import docx

SCOPES = ['https://www.googleapis.com/auth/gmail.modify']
query = "is:unread"

def authenticate_gmail():
    creds = None
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
        print("Granted scopes:", creds.scopes)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
    return build('gmail', 'v1', credentials=creds)

def extract_attachment_text(service, message_id, part):
    attachment_id = part['body'].get('attachmentId')
    if not attachment_id:
        return ""
    attachment = service.users().messages().attachments().get(
        userId='me', messageId=message_id, id=attachment_id
    ).execute()
    data = base64.urlsafe_b64decode(attachment['data'].encode('UTF-8'))

    # PDF
    if part['filename'].lower().endswith('.pdf'):
        try:
            reader = PdfReader(data)
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""
            return text
        except Exception as e:
            return f"[Could not read PDF: {e}]"
    # Word
    elif part['filename'].lower().endswith(('.doc', '.docx')):
        try:
            doc = docx.Document(io.BytesIO(data))
            text = "\n".join([p.text for p in doc.paragraphs])
            return text
        except Exception as e:
            return f"[Could not read Word document: {e}]"
    else:
        return "[Unsupported attachment type]"

def return_unread_emails(service):
    results = service.users().messages().list(
        userId='me', maxResults=100, labelIds=['INBOX'], q=query
    ).execute()
    messages = results.get('messages', [])
    if not messages:
        print("No unread messages.")
        return []

    filtered_messages = []
    for message in messages:
        msg = service.users().messages().get(userId='me', id=message['id'], format='raw').execute()
        raw_msg = base64.urlsafe_b64decode(msg['raw'].encode('ASCII'))
        email_msg = message_from_bytes(raw_msg)
        
        filtered_message = {
            'From': email_msg['From'],
            'Subject': email_msg['Subject'],
            'id': message['id'],
            'Body': ""
        }

        # Extract plain text body and attachments
        for part in email_msg.walk():
            if part.get_content_type() == 'text/plain':
                filtered_message['Body'] += part.get_payload(decode=True).decode()
            elif part.get('filename'):
                attachment_text = extract_attachment_text(service, message['id'], part)
                filtered_message['Body'] += f"\n[Attachment: {part.get('filename')}]\n{attachment_text}\n"

        filtered_messages.append(filtered_message)
    return filtered_messages

def mark_emails_as_read(service, email_id):
    service.users().messages().modify(
        userId='me',
        id=email_id,
        body={'removeLabelIds': ['UNREAD']}
    ).execute()

def trash_email(service, email_id):
    service.users().messages().trash(userId='me', id=email_id).execute()

def send_email(service, to, subject, body):
    from email.mime.text import MIMEText
    import base64
    message = MIMEText(body)
    message['to'] = to
    message['subject'] = subject
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    service.users().messages().send(userId='me', body={'raw': raw}).execute()
