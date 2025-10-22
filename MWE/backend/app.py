import datetime
import xml.etree.ElementTree as ET 
import re 
import html 
from flask import Flask, request, jsonify, Response,send_from_directory
from flask_cors import CORS
from flask_mail import Mail, Message
from bson import ObjectId
from pymongo import MongoClient
import bcrypt
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import PyPDF2
from docx import Document
import csv 
import io
import os
import math
import re 
import numpy as np  
import random
import csv
import io
from lxml import etree 
import secrets
import string
from werkzeug.utils import secure_filename
import traceback # Import for better error logging in complex routes


# --- Flask App Initialization ---
app = Flask(__name__)
CORS(app)

# --- MongoDB Connection ---
client = MongoClient("mongodb://localhost:27017/")
db = client["sentence_app"]

# --- Mail Configuration ---
app.config['MAIL_SERVER'] = 'smtp.gmail.com'  
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'mwa.iiith@gmail.com'
app.config['MAIL_PASSWORD'] = 'jjmd umfd lpds yzvh'      
mail = Mail(app)

# --- Collections (Updated) ---
users_collection = db["users"]
sentences_collection = db["sentences"]
user_activities_collection = db["user_activities"]
user_session_history_collection = db["user_session_history"]
tags_collection = db["tags"]             # FINAL/APPROVED tags
projects_collection = db["projects"]
search_tags_collection = db["search_tags"] 
feedback_collection = db["feedback"] 
org_admins_collection = db["org_admins"]
staged_tags_collection = db["staged_tags"] # NEW: Temporary storage for unreviewed tags
# --- Helper Functions (UNCHANGED) ---



# --- Configuration (UNCHANGED) ---
UPLOAD_FOLDER = 'feedback_uploads'
# Set maximum upload size to 5 megabytes
MAX_CONTENT_LENGTH = 5 * 1024 * 1024 
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
PORT = 5001

# Removed duplicate Flask app initialization block here

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Create the upload folder if it doesn't exist
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Helper function to check file extension (UNCHANGED)
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/feedback_uploads/<filename>')
def serve_feedback_image(filename):
    """Serve uploaded feedback images (UNCHANGED)"""
    try:
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404
    
def send_org_admin_notification(new_user_data):
    """Sends an email to the organization administrator about a new user pending approval. (UNCHANGED)"""
    
    # Find organization admin(s)
    org_admins = org_admins_collection.find({"organization": new_user_data['organization']})
    
    admin_emails = [admin['email'] for admin in org_admins]
    
    if not admin_emails:
        print(f"No admin found for organization: {new_user_data['organization']}")
        return
    
    try:
        msg = Message(
            subject=f"ACTION REQUIRED: New User Registration - {new_user_data['full_name']}",
            sender=app.config['MAIL_USERNAME'],
            recipients=admin_emails
        )
        
        msg.body = f"""
Dear Administrator,

A new user has registered and is awaiting your approval:

User Details:
- Full Name: {new_user_data['full_name']}
- Email: {new_user_data['email']}
- Organization: {new_user_data['organization']}
- Role: {new_user_data['role']}
- Languages: {', '.join(new_user_data['languages']) if new_user_data['languages'] else 'N/A'}
- Registration Date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}

Please log in to the admin panel to review and approve/reject this registration.

Best regards,
Sentence Annotation System
"""
        mail.send(msg)
        print(f"Notification sent to org admin(s): {admin_emails}")
        
    except Exception as e:
        print(f"Failed to send org admin notification: {e}")

def send_user_approval_email(user_data, approved=True):
    """Sends approval or rejection email to the user. (UNCHANGED)"""
    
    try:
        if approved:
            subject = "Account Approved - Sentence Annotation System"
            body = f"""
Dear {user_data['full_name']},

Your account registration has been approved by the administrator.

You can now log in to the Sentence Annotation System using your credentials:
- Username: {user_data['email']}

Access the system at: [Your System URL]

If you have any questions, please contact your organization administrator.

Best regards,
Sentence Annotation System Team
"""
        else:
            subject = "Account Registration Rejected"
            body = f"""
Dear {user_data['full_name']},

We regret to inform you that your account registration has been rejected by the administrator.

Organization: {user_data.get('organization', 'N/A')}

If you believe this is an error, please contact your organization administrator.

Best regards,
Sentence Annotation System Team
"""
        
        msg = Message(
            subject=subject,
            sender=app.config['MAIL_USERNAME'],
            recipients=[user_data['email']]
        )
        msg.body = body
        mail.send(msg)
        print(f"{'Approval' if approved else 'Rejection'} email sent to: {user_data['email']}")
        
    except Exception as e:
        print(f"Failed to send user {'approval' if approved else 'rejection'} email: {e}")


def send_admin_welcome_email(user_data):
    """Sends welcome email to newly registered admin users. (UNCHANGED)"""
    try:
        msg = Message(
            subject="Welcome to Sentence Annotation System - Admin Account Activated",
            sender=app.config['MAIL_USERNAME'],
            recipients=[user_data['email']]
        )
        
        msg.body = f"""
Dear {user_data['full_name']},

Your administrator account has been successfully created and activated.

You can now log in to the Sentence Annotation System using your credentials:
- Username: {user_data['email']}

As an administrator, you have access to:
- User management and approval
- Project creation and assignment
- System monitoring and reports

Access the system at: [Your System URL]

Best regards,
Sentence Annotation System Team
"""
        mail.send(msg)
        print(f"Welcome email sent to new admin: {user_data['email']}")
        
    except Exception as e:
        print(f"Failed to send admin welcome email: {e}")
        
def update_session_history_report(username_to_update):
    """Recalculates and saves the session history for a specific user. (UNCHANGED)"""
    logs_list = []
    UTC = ZoneInfo("UTC")
    IST = ZoneInfo("Asia/Kolkata")
    
    user_activity_doc = user_activities_collection.find_one({'username': username_to_update})
    if not user_activity_doc or not user_activity_doc.get('activities'): 
        return

    activities = sorted(user_activity_doc.get('activities', []), key=lambda x: x['timestamp'])
    session = None
    for act in activities:
        desc = act['description']
        utc_ts = act['timestamp']
        if desc == "Login":
            if session:
                prev_logout_ist = act['timestamp'].replace(tzinfo=UTC).astimezone(IST)
                session["logoutTimeIST"] = prev_logout_ist.strftime('%d/%m/%Y, %H:%M:%S')
                session["tasksDone"].append("--- (Session ended unexpectedly) ---")
                logs_list.append(session)
            login_ist = utc_ts.replace(tzinfo=UTC).astimezone(IST)
            session = {
                "id": f"{username_to_update}_{utc_ts.timestamp()}", "username": username_to_update,
                "loginTimeIST": login_ist.strftime('%d/%m/%Y, %H:%M:%S'),
                "logoutTimeIST": None, "tasksDone": []
            }
        elif desc == "Logout" and session:
            logout_ist = utc_ts.replace(tzinfo=UTC).astimezone(IST)
            session["logoutTimeIST"] = logout_ist.strftime('%d/%m/%Y, %H:%M:%S')
            logs_list.append(session)
            session = None
        elif session:
            session["tasksDone"].append(desc)
    if session: logs_list.append(session)

    sorted_sessions = sorted(logs_list, key=lambda s: s.get('id', ''), reverse=True)
    user_session_history_collection.update_one(
        {'username': username_to_update},
        {'$set': {'sessions': sorted_sessions}},
        upsert=True
    )
    print(f"User session history for '{username_to_update}' has been updated.")

def log_action_and_update_report(username, description):
    """Logs a new raw event and triggers a rebuild of that user's session history report. (UNCHANGED)"""
    user_activities_collection.update_one(
        {'username': username},
        {'$push': {'activities': {"timestamp": datetime.utcnow(), "description": description}}},
        upsert=True
    )
    update_session_history_report(username)

def clean_sentence_text(text):
    """
    Removes common leading numbering patterns (1., 1.1., A., etc.) and excessive whitespace. (UNCHANGED)
    """
    if not text:
        return ""
    
    text = re.sub(r'^\s*(\d+(\.\d+)*[\.\)\s]+\s*|[a-zA-Z][\.\)\s]+\s*)', '', text).strip()
    
    return text.strip()


def extract_from_xml(file):
    """
    Parses sentences and annotations directly from the structured XML file format (re-import).
    Returns a list of dictionaries containing sentence text, status, and tags. (UNCHANGED)
    """
    sentences_data = []
    
    file.seek(0)
    xml_content = file.read()
    if not xml_content:
        return sentences_data

    try:
        parser = etree.XMLParser(recover=True, encoding='utf-8')
        root = etree.fromstring(xml_content, parser=parser)
        
        # Check if this is the new format (with sentences wrapper)
        sentences_root = root.find(".//sentences")
        if sentences_root is not None:
            # New format: <project><sentences><sentence ...></sentence></sentences></project>
            sentence_elems = sentences_root.findall(".//sentence")
        else:
            # Old format: direct sentence elements
            sentence_elems = root.findall(".//sentence")
        
        for sentence_elem in sentence_elems:
            # Try to get text from attribute first (new format)
            text_content = sentence_elem.get('text', '').strip()
            
            # If not found in attribute, try to find Text element (old format)
            if not text_content:
                text_elem = sentence_elem.find('Text')
                if text_elem is not None:
                    text_content = text_elem.text.strip() if text_elem.text else ''
            
            # Try to get is_annotated from attribute first (new format)
            is_annotated_attr = sentence_elem.get('isAnnotated', '').strip().lower()
            if is_annotated_attr:
                is_annotated = is_annotated_attr == 'true'
            else:
                # Fallback to old format
                is_annotated_text = sentence_elem.findtext('is_annotated', default='False').strip()
                is_annotated = is_annotated_text.lower() == 'true'
            
            tags = []
            annotations_elem = sentence_elem.find('annotations')
            if annotations_elem is not None:
                for annotation_elem in annotations_elem.findall('annotation'):
                    # Get annotation data from attributes
                    word_phrase = annotation_elem.get('word_phrase', '').strip()
                    annotation_type = annotation_elem.get('annotation', '').strip()
                    annotated_by = annotation_elem.get('annotated_by', '').strip()
                    annotated_on = annotation_elem.get('annotated_on', '').strip()
                    
                    if word_phrase and annotation_type:
                        tags.append({
                            'tag': annotation_type,
                            'text': word_phrase,
                            'annotated_by': annotated_by,
                            'annotated_on': annotated_on
                        })
            
            if text_content:
                sentences_data.append({
                    "textContent": text_content,
                    "is_annotated": is_annotated,
                    "tags": tags 
                })
                
    except etree.XMLSyntaxError as e:
        print(f"XML Parsing Error: {e}")
        raise ValueError("Invalid XML file structure.")
    except Exception as e:
        print(f"Generic XML Extraction Error: {e}")
        raise ValueError("Failed to process XML content.")

    return sentences_data

def extract_text_from_file(file, file_extension):
    """
    Extracts text and annotation metadata from uploaded files for project creation. (UNCHANGED)
    """
    if file_extension == '.xml':
        return extract_from_xml(file)

    sentences_data = []
    
    # Regex patterns for structured annotation format
    SENTENCE_LINE_REGEX = re.compile(r"^Sentence ID:\s*\d+,\s*Text:\s*'([^']*)'")
    ANNOTATION_LINE_REGEX = re.compile(
        r'^\s*Annotation:\s*(?P<tag>[^,]+),\s*Word_Phrase:\s*\'(?P<text>.*?)\',\s*Annotated by:\s*(?P<by>[^,]+),\s*Annotated on:\s*(?P<on>[^\s]+)'
    )
    
    try:
        file.seek(0)
        raw_text = ""
        
        # Read file content based on file type
        if file_extension == '.txt':
            raw_text = file.read().decode('utf-8', errors='ignore')
        elif file_extension == '.pdf':
            # PDF text extraction
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                raw_text += page.extract_text() + "\n"
        elif file_extension in ['.doc', '.docx']:
            # DOCX text extraction
            doc = Document(file)
            for paragraph in doc.paragraphs:
                raw_text += paragraph.text + "\n"
        elif file_extension == '.csv':
            # CSV text extraction - read all cells
            csv_content = file.read().decode('utf-8', errors='ignore')
            csv_reader = csv.reader(io.StringIO(csv_content))
            for row in csv_reader:
                for cell in row:
                    if cell.strip():
                        raw_text += cell.strip() + " "
                raw_text += "\n"
        else:
            raise ValueError(f"Unsupported file type: {file_extension}")
        
        # Check if this is a structured file (with Sentence ID patterns) or plain text
        if SENTENCE_LINE_REGEX.search(raw_text):
            # Process as structured file with annotations
            print("Detected structured annotation file format")
            raw_lines = raw_text.split('\n')
            current_sentence = None
            
            for line in raw_lines:
                line = line.strip()
                if not line:
                    continue

                # Check for Sentence line
                sentence_match = SENTENCE_LINE_REGEX.match(line)
                if sentence_match:
                    # If we have a previous sentence, add it to the list
                    if current_sentence:
                        sentences_data.append(current_sentence)
                    
                    # Start new sentence
                    text_content = sentence_match.group(1).strip()
                    if text_content:
                        current_sentence = {
                            "textContent": text_content,
                            "is_annotated": False,
                            "tags": []
                        }
                    continue

                # Check for Annotation line
                annotation_match = ANNOTATION_LINE_REGEX.match(line)
                if annotation_match and current_sentence:
                    # Mark the current sentence as annotated
                    current_sentence['is_annotated'] = True
                    
                    # Extract annotation data
                    tag_data = annotation_match.groupdict()
                    tag_record = {
                        'tag': tag_data['tag'].strip(),
                        'text': tag_data['text'].strip(),
                        'annotated_by': tag_data['by'].strip(),
                        'annotated_on': tag_data['on'].strip(),
                    }
                    current_sentence['tags'].append(tag_record)
                    continue

            # Don't forget to add the last sentence
            if current_sentence:
                sentences_data.append(current_sentence)
                
        else:
            # Process as plain text with Hindi/English punctuation
            print("Detected plain text format - splitting by punctuation")
            
            # Enhanced sentence splitting for multiple languages
            # Split on Hindi full stop (।), double danda (॥), and standard punctuation
            sentences = re.split(r'([।|॥|\.|\?|!]+)\s*', raw_text)
            
            # Reconstruct sentences with their punctuation
            reconstructed_sentences = []
            i = 0
            while i < len(sentences):
                sentence_text = sentences[i].strip()
                if i + 1 < len(sentences) and sentences[i + 1].strip() in ['।', '॥', '.', '?', '!']:
                    # Add punctuation back to the sentence
                    sentence_text += sentences[i + 1].strip()
                    i += 2
                else:
                    i += 1
                
                if sentence_text:
                    reconstructed_sentences.append(sentence_text)
            
            # If the above method doesn't work well, fall back to simple splitting
            if not reconstructed_sentences:
                sentences = re.split(r'[।|॥|\.|\?|!]\s*', raw_text)
                reconstructed_sentences = [s.strip() + '.' for s in sentences if s.strip()]
            
            # Clean and add sentences
            for sentence_text in reconstructed_sentences:
                clean_text = sentence_text.strip()
                if clean_text and len(clean_text) > 1:  # Filter out very short strings
                    # Remove excessive whitespace
                    clean_text = re.sub(r'\s+', ' ', clean_text)
                    
                    sentences_data.append({
                        "textContent": clean_text,
                        "is_annotated": False,
                        "tags": []
                    })
            
            print(f"Extracted {len(sentences_data)} sentences from plain text")
            
    except PyPDF2.PdfReadError as e:
        raise ValueError(f"Invalid PDF file: {str(e)}")
    except Exception as e:
        print(f"Error parsing file {file_extension}: {e}")
        raise ValueError(f"Failed to parse file: {str(e)}")
        
    return sentences_data

# --- API Routes ---

@app.route("/register", methods=["POST"])
def register():
    """Handles user registration. (UNCHANGED)"""
    data = request.json
    username, password, email, role = data.get("email"), data.get("password"), data.get("email"), data.get("role")
    
    full_name = data.get("fullName", "N/A")
    organization = data.get("organization", "N/A")
    languages = data.get("languages", [])

    if not all([username, password, email, role]): 
        return jsonify({"message": "All required fields are mandatory"}), 400
    
    if users_collection.find_one({"username": username}): 
        return jsonify({"message": "Account with this email already exists"}), 400
        
    hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    
    # Auto-approve admin users, require approval for other roles
    is_approved = (role.lower() == "admin")
    
    # Insert new user record
    user_data = {
        "username": username, 
        "full_name": full_name, 
        "email": email, 
        "password": hashed_pw, 
        "role": role, 
        "organization": organization,
        "languages": languages, 
        "is_approved": is_approved, 
        "registered_at": datetime.utcnow(),
        "approved_by": "auto" if is_approved else None,
        "approved_at": datetime.utcnow() if is_approved else None,
        "rejection_reason": None
    }
    
    users_collection.insert_one(user_data)
    
    user_activities_collection.insert_one({"username": username, "activities": []})
    user_session_history_collection.insert_one({"username": username, "sessions": []})
    
    # Collect data for the email notification
    user_data_for_email = {
        "full_name": full_name, 
        "email": email, 
        "role": role, 
        "organization": organization,
        "languages": languages
    }
    
    # NEW: Add admin users to org_admins collection
    if role.lower() == "admin":
        # Check if admin already exists in org_admins to avoid duplicates
        existing_admin = org_admins_collection.find_one({"email": email, "organization": organization})
        if not existing_admin:
            org_admin_data = {
                "username": username,
                "full_name": full_name,
                "email": email,
                "organization": organization,
                "role": role,
                "added_at": datetime.utcnow(),
                "is_active": True
            }
            org_admins_collection.insert_one(org_admin_data)
            print(f"Admin user {username} added to org_admins collection for organization {organization}")
        
        # Auto-approved admin - send welcome email
        send_admin_welcome_email(user_data_for_email)
        log_action_and_update_report("system", f'New ADMIN user registered and auto-approved: {username}.')
        return jsonify({"message": "Admin user registered successfully. You can login immediately."})
    else:
        # Regular user (Annotator or Reviewer) - send approval request to org admin
        send_org_admin_notification(user_data_for_email)
        log_action_and_update_report("system", f'New user registered: {username}. Awaiting approval.')
        return jsonify({"message": "User registered successfully. Awaiting admin approval."})
    

@app.route("/api/org-admins", methods=["GET"])
def get_org_admins():
    """Get all organization administrators (UNCHANGED)"""
    try:
        admins = list(org_admins_collection.find({}, {"password": 0}).sort("organization", 1))
        for admin in admins:
            admin["_id"] = str(admin["_id"])
            if "added_at" in admin:
                admin["added_at"] = admin["added_at"].strftime('%Y-%m-%d %H:%M:%S')
        return jsonify(admins), 200
    except Exception as e:
        print(f"Error fetching org admins: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/org-admins", methods=["POST"])
def add_org_admin():
    """Manually add an organization administrator (UNCHANGED)"""
    try:
        data = request.json
        required_fields = ["username", "email", "organization", "full_name"]
        
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400
        
        # Check if admin already exists
        existing_admin = org_admins_collection.find_one({
            "$or": [
                {"email": data["email"]},
                {"username": data["username"]}
            ]
        })
        
        if existing_admin:
            return jsonify({"error": "Admin with this email or username already exists"}), 400
        
        admin_data = {
            "username": data["username"],
            "full_name": data["full_name"],
            "email": data["email"],
            "organization": data["organization"],
            "role": data.get("role", "admin"),
            "added_at": datetime.utcnow(),
            "is_active": True
        }
        
        result = org_admins_collection.insert_one(admin_data)
        
        return jsonify({
            "message": "Organization admin added successfully",
            "admin_id": str(result.inserted_id)
        }), 201
        
    except Exception as e:
        print(f"Error adding org admin: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/org-admins/<admin_id>", methods=["DELETE"])
def remove_org_admin(admin_id):
    """Remove an organization administrator (UNCHANGED)"""
    try:
        result = org_admins_collection.delete_one({"_id": ObjectId(admin_id)})
        
        if result.deleted_count == 0:
            return jsonify({"error": "Admin not found"}), 404
            
        return jsonify({"message": "Organization admin removed successfully"}), 200
        
    except Exception as e:
        print(f"Error removing org admin: {e}")
        return jsonify({"error": "Internal server error"}), 500



@app.route('/feedback', methods=['POST'])
def submit_feedback():
    """
    Handles submission of feedback text and an optional screenshot. (UNCHANGED)
    """
    
    # 1. Get Text Feedback and User Email from form data
    feedback_text = request.form.get('feedbackText', '').strip()
    user_email = request.form.get('userEmail', 'anonymous@app.com').strip() # Get email from form data
    submission_time = datetime.utcnow()

    # 2. Get Optional File Upload (screenshot)
    screenshot_file = request.files.get('screenshot')

    if not feedback_text and not screenshot_file:
        return jsonify({"message": "Feedback text or a screenshot is required."}), 400

    # 3. Handle File Upload (if present)
    file_path = None
    if screenshot_file:
        if screenshot_file.filename == '':
            pass 
        elif not allowed_file(screenshot_file.filename):
            return jsonify({"message": "Invalid file type. Only PNG, JPG, JPEG, GIF allowed."}), 400
        else:
            try:
                filename = secure_filename(screenshot_file.filename)
                # Ensure filename uniqueness
                filename_base, file_ext = os.path.splitext(filename)
                unique_filename = f"{filename_base}_{datetime.now().strftime('%Y%m%d%H%M%S')}{file_ext}"

                full_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                screenshot_file.save(full_path)
                file_path = unique_filename # Store only the unique filename in the DB
            except Exception as e:
                print(f"Error saving file: {e}")
                return jsonify({"message": "Failed to save screenshot."}), 500
    
    # 4. Insert into MongoDB feedback_collection
    feedback_doc = {
        "email": user_email,
        "feedback_text": feedback_text,
        "file_path": file_path, # File name if uploaded, None otherwise
        "time": submission_time,
        "is_reviewed": False 
    }
    
    result = feedback_collection.insert_one(feedback_doc)

    print(f"\n--- NEW FEEDBACK SUBMISSION SAVED ---")
    print(f"ID: {result.inserted_id}")
    print(f"Email: {user_email}")
    print(f"Text: {feedback_text}")
    print(f"File: {file_path}")
    print("---------------------------------")

    return jsonify({"message": "Feedback submitted successfully and saved for review."}), 200

@app.route("/admin/feedbacks", methods=["GET"])
def get_all_feedbacks():
    """Fetches all stored feedback for the admin dashboard. (UNCHANGED)"""
    try:
        feedbacks_cursor = feedback_collection.find().sort("time", -1) 
        
        feedbacks_list = []
        for feedback in feedbacks_cursor:
            feedback_data = {
                "id": str(feedback["_id"]),
                "email": feedback.get("email", "anonymous@example.com"),
                "feedback": feedback.get("feedback_text", "[No text]"),
                "file": feedback.get("file_path", "None"),
                "time": feedback.get("time", datetime.utcnow()).strftime('%Y-%m-%d %H:%M:%S UTC'),
                "is_reviewed": feedback.get("is_reviewed", False)
            }
            feedbacks_list.append(feedback_data)
            
        return jsonify(feedbacks_list), 200
        
    except Exception as e:
        print(f"Error fetching all feedbacks: {e}")
        return jsonify({"error": "Internal server error while fetching feedbacks"}), 500

@app.route("/admin/feedbacks/<feedback_id>/review", methods=["PUT"])
def mark_feedback_reviewed(feedback_id):
    """Marks a specific feedback item as reviewed. (UNCHANGED)"""
    try:
        result = feedback_collection.update_one(
            {"_id": ObjectId(feedback_id)},
            {"$set": {"is_reviewed": True}}
        )
        if result.matched_count == 0:
            return jsonify({"message": "Feedback not found."}), 404
        
        return jsonify({"message": "Feedback marked as reviewed successfully."}), 200
    except Exception as e:
        print(f"Error marking feedback as reviewed: {e}")
        return jsonify({"error": "Internal server error."}), 500


# Add this route to your app.py
@app.route("/admin/feedbacks/<feedback_id>", methods=["DELETE"])
def delete_feedback(feedback_id):
    """Delete a specific feedback item. (UNCHANGED)"""
    try:
        # Find the feedback to get file path for cleanup
        feedback = feedback_collection.find_one({"_id": ObjectId(feedback_id)})
        if not feedback:
            return jsonify({"message": "Feedback not found."}), 404
        
        # Delete associated file if exists
        file_path = feedback.get("file_path")
        if file_path and file_path != "None":
            try:
                full_path = os.path.join(app.config['UPLOAD_FOLDER'], file_path)
                if os.path.exists(full_path):
                    os.remove(full_path)
            except Exception as file_error:
                print(f"Error deleting feedback file: {file_error}")
        
        # Delete the feedback document
        result = feedback_collection.delete_one({"_id": ObjectId(feedback_id)})
        
        if result.deleted_count == 0:
            return jsonify({"message": "Feedback not found."}), 404
        
        return jsonify({"message": "Feedback deleted successfully."}), 200
    except Exception as e:
        print(f"Error deleting feedback: {e}")
        return jsonify({"error": "Internal server error."}), 500
    
@app.route("/login", methods=["POST"])
def login():
    """Handles user login and checks for approval status. (UNCHANGED)"""
    data = request.json
    username_or_email, password = data.get("username"), data.get("password")
    
    user = users_collection.find_one({"username": username_or_email})
    
    if not user or not bcrypt.checkpw(password.encode("utf-8"), user["password"]):
        return jsonify({"message": "Invalid credentials"}), 401
    
    # Allow admin users to login immediately, check approval for other roles
    if user.get("role", "").lower() != "admin" and not user.get("is_approved", False):
        return jsonify({"error": "Account awaiting admin approval", "message": "Your account is pending admin approval."}), 403
    
    log_action_and_update_report(username_or_email, 'Login')
    
    return jsonify({
        "message": "Login successful", 
        "username": username_or_email, 
        "role": user.get("role", "user")
    })


# Add these imports at the top if not already present
import random
import string

# OTP-based Password Reset Endpoints (UNCHANGED)

@app.route("/forgot-password", methods=["POST"])
def forgot_password():
    """Send password reset OTP via email (UNCHANGED)"""
    try:
        data = request.json
        email = data.get("email")
        
        if not email:
            return jsonify({"error": "Email is required"}), 400
        
        # Check if user exists
        user = users_collection.find_one({"email": email})
        if not user:
            # Don't reveal whether email exists or not for security
            return jsonify({"message": "If an account with that email exists, an OTP has been sent to your email."}), 200
        
        # Generate 6-digit OTP
        otp = ''.join(random.choices(string.digits, k=6))
        otp_expiry = datetime.utcnow() + timedelta(minutes=10)  # OTP valid for 10 minutes
        
        # Store OTP in database
        users_collection.update_one(
            {"email": email},
            {"$set": {
                "reset_otp": otp,
                "reset_otp_expiry": otp_expiry
            }}
        )
        
        # Send OTP email
        try:
            msg = Message(
                subject="Password Reset OTP - Sentence Annotation System",
                sender=app.config['MAIL_USERNAME'],
                recipients=[email]
            )
            
            msg.body = f"""
Dear {user.get('full_name', 'User')},

You have requested to reset your password for the Sentence Annotation System.

Your One-Time Password (OTP) is: {otp}

This OTP will expire in 10 minutes.

If you did not request a password reset, please ignore this email.

Best regards,
Sentence Annotation System Team
"""
            mail.send(msg)
            print(f"Password reset OTP sent to: {email}")
            
        except Exception as e:
            print(f"Failed to send OTP email: {e}")
            return jsonify({"error": "Failed to send OTP email"}), 500
        
        return jsonify({"message": "If an account with that email exists, an OTP has been sent to your email."}), 200
        
    except Exception as e:
        print(f"Error in forgot password: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/verify-otp", methods=["POST"])
def verify_otp():
    """Verify OTP for password reset (UNCHANGED)"""
    try:
        data = request.json
        email = data.get("email")
        otp = data.get("otp")
        
        if not all([email, otp]):
            return jsonify({"error": "Email and OTP are required"}), 400
        
        # Find user with valid OTP
        user = users_collection.find_one({
            "email": email,
            "reset_otp": otp,
            "reset_otp_expiry": {"$gt": datetime.utcnow()}
        })
        
        if not user:
            return jsonify({"error": "Invalid or expired OTP"}), 400
        
        # Generate verification token for the reset session
        verification_token = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
        
        # Store verification token
        users_collection.update_one(
            {"email": email},
            {"$set": {
                "reset_verified": True,
                "reset_verification_token": verification_token
            }}
        )
        
        return jsonify({
            "message": "OTP verified successfully",
            "verification_token": verification_token
        }), 200
        
    except Exception as e:
        print(f"Error verifying OTP: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/reset-password", methods=["POST"])
def reset_password():
    """Reset password using verified OTP session (UNCHANGED)"""
    try:
        data = request.json
        email = data.get("email")
        verification_token = data.get("verification_token")
        new_password = data.get("newPassword")
        
        if not all([email, verification_token, new_password]):
            return jsonify({"error": "All fields are required"}), 400
        
        # Verify the reset session
        user = users_collection.find_one({
            "email": email,
            "reset_verification_token": verification_token,
            "reset_verified": True
        })
        
        if not user:
            return jsonify({"error": "Invalid reset session. Please start over."}), 400
        
        # Hash new password
        hashed_pw = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt())
        
        # Update password and clear reset fields
        users_collection.update_one(
            {"email": email},
            {"$set": {
                "password": hashed_pw
            }, "$unset": {
                "reset_otp": "",
                "reset_otp_expiry": "",
                "reset_verified": "",
                "reset_verification_token": ""
            }}
        )
        
        # Send confirmation email
        try:
            msg = Message(
                subject="Password Reset Successful - Sentence Annotation System",
                sender=app.config['MAIL_USERNAME'],
                recipients=[email]
            )
            
            msg.body = f"""
Dear {user.get('full_name', 'User')},

Your password has been successfully reset.

If you did not perform this action, please contact your administrator immediately.

Best regards,
Sentence Annotation System Team
"""
            mail.send(msg)
            print(f"Password reset confirmation sent to: {email}")
            
        except Exception as e:
            print(f"Failed to send password reset confirmation: {e}")
            # Don't return error here as password was still reset successfully
        
        # Log the action
        log_action_and_update_report(user["username"], "Password reset via OTP")
        
        return jsonify({"message": "Password reset successfully"}), 200
        
    except Exception as e:
        print(f"Error resetting password: {e}")
        return jsonify({"error": "Internal server error"}), 500
    
# --- NEW ADMIN ROUTES FOR APPROVAL (UNCHANGED) ---

@app.route("/admin/pending-users", methods=["GET"])
def get_pending_users():
    """Fetches list of users who are not yet approved and not rejected (excluding admins). (UNCHANGED)"""
    try:
        # Only show non-admin users pending approval AND not rejected
        pending_users_cursor = users_collection.find(
            {
                "is_approved": False,
                "is_rejected": {"$ne": True},  # NEW: Exclude rejected users
                "role": {"$ne": "admin"}  # Exclude admin users
            },
            {
                "username": 1, 
                "full_name": 1, 
                "email": 1, 
                "role": 1, 
                "organization": 1, 
                "languages": 1,
                "registered_at": 1
            }
        ).sort("registered_at", 1)
        
        pending_list = []
        for user in pending_users_cursor:
            user['_id'] = str(user['_id'])
            if 'registered_at' in user:
                user['registered_at'] = user['registered_at'].strftime('%Y-%m-%d %H:%M:%S')
            pending_list.append(user)
            
        return jsonify(pending_list), 200
        
    except Exception as e:
        print(f"Error fetching pending users: {e}")
        return jsonify({"error": "Internal server error"}), 500
 
  
@app.route("/admin/approve-user/<user_id>", methods=["PUT"])
def approve_user(user_id):
    """Approves a specific user by ID."""
    try:
        data = request.json
        admin_username = data.get("adminUsername")
        
        result = users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {
                "is_approved": True, 
                "approval_date": datetime.utcnow(),
                "approved_by": admin_username
            }}
        )
        
        if result.matched_count == 0:
            return jsonify({"message": "User not found."}), 404
        
        user_doc = users_collection.find_one({"_id": ObjectId(user_id)})
        
        # Send approval email to user
        send_user_approval_email(user_doc, approved=True)
        
        log_action_and_update_report(admin_username, f'Approved user account for: {user_doc.get("username", "Unknown User")}.')
        
        return jsonify({"message": f"User {user_doc.get('username', 'Unknown User')} successfully approved."}), 200
        
    except Exception as e:
        print(f"Error approving user: {e}")
        return jsonify({"error": "Internal server error during approval"}), 500

@app.route("/admin/reject-user/<user_id>", methods=["PUT"])
def reject_user(user_id):
    """Rejects a specific user by ID (soft delete with is_rejected flag)."""
    try:
        data = request.json
        admin_username = data.get("adminUsername")
        rejection_reason = data.get("rejectionReason", "No reason provided")
        
        user_doc = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user_doc:
            return jsonify({"message": "User not found."}), 404
        
        # Update rejection info and flag
        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {
                "is_rejected": True,
                "rejection_reason": rejection_reason,
                "rejected_by": admin_username,
                "rejected_at": datetime.utcnow(),
                "is_approved": False  # Ensure this remains False
            }}
        )

        # Send rejection email
        send_user_approval_email(user_doc, approved=False)
        
        # Log action
        log_action_and_update_report(
            admin_username, 
            f"Rejected user account for: {user_doc.get('username', 'Unknown User')}. Reason: {rejection_reason}"
        )
        
        return jsonify({"message": f"User {user_doc.get('username', 'Unknown User')} successfully rejected."}), 200

    except Exception as e:
        print(f"Error rejecting user: {e}")
        return jsonify({"error": f"Internal server error during rejection: {str(e)}"}), 500


# --- Other Routes (Unchanged) ---
@app.route("/check-role", methods=["POST"])
def check_role():
    data = request.json
    username = data.get("username")
    user = users_collection.find_one({"username": username})
    if not user:
        return jsonify({"message": "User not found"}), 404
    
    # Allow admin users regardless of approval status
    if user.get("role", "").lower() != "admin" and not user.get("is_approved", False):
        return jsonify({"role": "unapproved"}), 403 
        
    return jsonify({"role": user.get("role", "user")})


@app.route("/logout", methods=["POST"])
def logout():
    data = request.json
    username = data.get("username")
    log_action_and_update_report(username, 'Logout')
    return jsonify({"message": "Logout successful"})

@app.route('/api/users-list', methods=['GET'])
def get_users_list():
    try:
        # Get only approved non-admin users
        users = users_collection.find({
            'is_approved': True, 
            'role': {'$ne': 'admin'}
        }, {'username': 1, '_id': 0})
        
        user_list = [user['username'] for user in users]
        return jsonify(user_list), 200
    except Exception as e:
        print(f"Error fetching users: {e}")
        return jsonify({"error": "Internal server error"}), 500
   
   
@app.route("/api/user/<username>", methods=["GET"])
def get_user_data(username):
    try:
        user = users_collection.find_one(
            {"username": username}, 
            {"full_name": 1, "email": 1, "role": 1, "_id": 0}
        )
        if user:
            return jsonify(user), 200
        else:
            return jsonify({"error": "User not found"}), 404
    except Exception as e:
        print(f"Error fetching user data: {e}")
        return jsonify({"error": "Internal server error"}), 500

# --- Visualization & Analytics Endpoints (UNCHANGED) ---

@app.route("/api/analytics/mwe-distribution", methods=["GET"])
def get_mwe_distribution():
    """Get MWE type distribution across various dimensions"""
    try:
        # Get optional filters from query parameters
        language = request.args.get("language")
        project_id = request.args.get("project_id")
        username = request.args.get("username")
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        
        # Build match filter
        match_filter = {}
        if language:
            match_filter["language"] = language
        if username:
            match_filter["username"] = username
        if start_date and end_date:
            try:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
                match_filter["annotation_date"] = {"$gte": start_dt, "$lte": end_dt}
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        
        # If project_id is provided, we need to join with sentences collection
        if project_id:
            # First, get all sentence IDs for this project
            project_sentences = list(sentences_collection.find(
                {"project_id": project_id}, 
                {"_id": 1}
            ))
            sentence_ids = [str(s["_id"]) for s in project_sentences]
            
            if sentence_ids:
                match_filter["source_sentence_id"] = {"$in": sentence_ids}
            else:
                # No sentences found for this project
                return jsonify({
                    "total_annotations": 0,
                    "mwe_types": [],
                    "language_distribution": [],
                    "user_distribution": [],
                    "project_distribution": []
                }), 200
        
        # Main aggregation pipeline for MWE distribution
        pipeline = [
            {"$match": match_filter},
            {"$group": {
                "_id": "$tag",
                "count": {"$sum": 1},
                "unique_words": {"$addToSet": "$text"}
            }},
            {"$project": {
                "mwe_type": "$_id",
                "count": 1,
                "unique_word_count": {"$size": "$unique_words"},
                "_id": 0
            }},
            {"$sort": {"count": -1}}
        ]
        
        mwe_distribution = list(tags_collection.aggregate(pipeline))
        
        # Additional aggregations for different dimensions
        # Language distribution
        lang_pipeline = [
            {"$lookup": {
                "from": "sentences",
                "localField": "source_sentence_id",
                "foreignField": "_id",
                "as": "sentence_info"
            }},
            {"$unwind": {"path": "$sentence_info", "preserveNullAndEmptyArrays": True}},
            {"$lookup": {
                "from": "projects",
                "localField": "sentence_info.project_id",
                "foreignField": "_id",
                "as": "project_info"
            }},
            {"$unwind": {"path": "$project_info", "preserveNullAndEmptyArrays": True}},
            {"$group": {
                "_id": "$project_info.language",
                "count": {"$sum": 1},
                "mwe_types": {"$addToSet": "$tag"}
            }},
            {"$project": {
                "language": {"$ifNull": ["$_id", "Unknown"]},
                "count": 1,
                "mwe_type_count": {"$size": "$mwe_types"},
                "_id": 0
            }},
            {"$sort": {"count": -1}}
        ]
        
        language_distribution = list(tags_collection.aggregate(lang_pipeline))
        
        # User distribution
        user_pipeline = [
            {"$match": match_filter},
            {"$group": {
                "_id": "$username",
                "count": {"$sum": 1},
                "mwe_types": {"$addToSet": "$tag"}
            }},
            {"$project": {
                "username": "$_id",
                "count": 1,
                "mwe_type_count": {"$size": "$mwe_types"},
                "_id": 0
            }},
            {"$sort": {"count": -1}}
        ]
        
        user_distribution = list(tags_collection.aggregate(user_pipeline))
        
        # Project distribution
        project_pipeline = [
            {"$lookup": {
                "from": "sentences",
                "localField": "source_sentence_id",
                "foreignField": "_id",
                "as": "sentence_info"
            }},
            {"$unwind": {"path": "$sentence_info", "preserveNullAndEmptyArrays": True}},
            {"$lookup": {
                "from": "projects",
                "localField": "sentence_info.project_id",
                "foreignField": "_id",
                "as": "project_info"
            }},
            {"$unwind": {"path": "$project_info", "preserveNullAndEmptyArrays": True}},
            {"$match": match_filter},
            {"$group": {
                "_id": "$project_info.name",
                "count": {"$sum": 1},
                "mwe_types": {"$addToSet": "$tag"},
                "project_id": {"$first": "$sentence_info.project_id"}
            }},
            {"$project": {
                "project_name": {"$ifNull": ["$_id", "Unknown Project"]},
                "project_id": 1,
                "count": 1,
                "mwe_type_count": {"$size": "$mwe_types"},
                "_id": 0
            }},
            {"$sort": {"count": -1}}
        ]
        
        project_distribution = list(tags_collection.aggregate(project_pipeline))
        
        total_annotations = sum(item["count"] for item in mwe_distribution)
        
        return jsonify({
            "total_annotations": total_annotations,
            "mwe_types": mwe_distribution,
            "language_distribution": language_distribution,
            "user_distribution": user_distribution,
            "project_distribution": project_distribution
        }), 200
        
    except Exception as e:
        print(f"Error fetching MWE distribution: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/analytics/mwe-network", methods=["GET"])
def get_mwe_network():
    """Generate network data for MWE relationships"""
    try:
        # Get all MWE annotations
        all_tags = list(tags_collection.find({}, {
            "text": 1, 
            "tag": 1, 
            "username": 1,
            "source_sentence_id": 1
        }))
        
        nodes = []
        links = []
        node_ids = {}
        node_counter = 0
        
        # Helper function to add or get node ID
        def get_node_id(text, mwe_type):
            nonlocal node_counter
            key = f"{text}_{mwe_type}"
            if key not in node_ids:
                node_ids[key] = node_counter
                nodes.append({
                    "id": node_counter,
                    "name": text,
                    "mwe_type": mwe_type,
                    "value": 1  # Will be updated with frequency
                })
                node_counter += 1
            return node_ids[key]
        
        # First pass: create nodes and count frequencies
        for tag in all_tags:
            text = tag.get("text", "").strip().lower()
            mwe_type = tag.get("tag", "Unknown")
            if text:
                node_id = get_node_id(text, mwe_type)
                nodes[node_id]["value"] += 1
        
        # Second pass: create links based on shared roots and relationships
        mwe_by_type = {}
        for tag in all_tags:
            text = tag.get("text", "").strip().lower()
            mwe_type = tag.get("tag", "Unknown")
            if text and mwe_type:
                if mwe_type not in mwe_by_type:
                    mwe_by_type[mwe_type] = []
                mwe_by_type[mwe_type].append(text)
        
        # Create links within same MWE types (clustering)
        for mwe_type, words in mwe_by_type.items():
            # Simple stemming-based relationships
            word_stems = {}
            for word in words:
                # Basic stemming: take first 4 characters as stem
                stem = word[:4].lower()
                if stem not in word_stems:
                    word_stems[stem] = []
                word_stems[stem].append(word)
            
            # Create links for words sharing the same stem
            for stem, stem_words in word_stems.items():
                if len(stem_words) > 1:
                    # Create a complete graph for words sharing the same stem
                    for i, word1 in enumerate(stem_words):
                        for word2 in stem_words[i+1:]:
                            if word1 != word2:
                                source_id = get_node_id(word1, mwe_type)
                                target_id = get_node_id(word2, mwe_type)
                                
                                # Check if link already exists
                                existing_link = next(
                                    (link for link in links 
                                     if link["source"] == source_id and link["target"] == target_id),
                                    None
                                )
                                
                                if existing_link:
                                    existing_link["value"] += 1
                                else:
                                    links.append({
                                        "source": source_id,
                                        "target": target_id,
                                        "value": 1,
                                        "type": "shared_stem"
                                    })
        
        # Add some random layout positions for visualization
        for node in nodes:
            node["x"] = np.random.random() * 100 if 'np' in globals() else random.random() * 100
            node["y"] = np.random.random() * 100 if 'np' in globals() else random.random() * 100
        
        return jsonify({
            "nodes": nodes,
            "links": links,
            "total_nodes": len(nodes),
            "total_links": len(links)
        }), 200
        
    except Exception as e:
        print(f"Error generating MWE network: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/analytics/reports/download", methods=["GET"])
def download_analytics_report():
    """Download comprehensive analytics report in CSV or PDF format"""
    try:
        report_type = request.args.get("type", "csv")  # csv or pdf
        language = request.args.get("language")
        project_id = request.args.get("project_id")
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        
        # Build base filter for data
        base_filter = {}
        if language:
            base_filter["language"] = language
        if start_date and end_date:
            try:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
                base_filter["annotation_date"] = {"$gte": start_dt, "$lte": end_dt}
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        
        # Get basic statistics
        total_sentences = sentences_collection.count_documents({})
        annotated_sentences = sentences_collection.count_documents({"is_annotated": True})
        total_annotations = tags_collection.count_documents({})
        
        # Get user statistics
        user_stats = list(users_collection.aggregate([
            {"$lookup": {
                "from": "sentences",
                "localField": "username",
                "foreignField": "username",
                "as": "user_sentences"
            }},
            {"$lookup": {
                "from": "tags",
                "localField": "username",
                "foreignField": "username",
                "as": "user_annotations"
            }},
            {"$project": {
                "username": 1,
                "full_name": 1,
                "role": 1,
                "organization": 1,
                "total_sentences": {"$size": "$user_sentences"},
                "annotated_sentences": {
                    "$size": {
                        "$filter": {
                            "input": "$user_sentences",
                            "as": "sentence",
                            "cond": {"$eq": ["$$sentence.is_annotated", True]}
                        }
                    }
                },
                "total_annotations": {"$size": "$user_annotations"},
                "approval_rate": {
                    "$cond": [
                        {"$eq": [{"$size": "$user_sentences"}, 0]},
                        0,
                        {
                            "$divide": [
                                {"$size": {
                                    "$filter": {
                                        "input": "$user_sentences",
                                        "as": "sentence",
                                        "cond": {"$eq": ["$$sentence.is_annotated", True]}
                                    }
                                }},
                                {"$size": "$user_sentences"}
                            ]
                        }
                    ]
                }
            }}
        ]))
        
        # Get MWE type statistics
        mwe_stats = list(tags_collection.aggregate([
            {"$group": {
                "_id": "$tag",
                "count": {"$sum": 1},
                "unique_phrases": {"$addToSet": "$text"},
                "unique_annotators": {"$addToSet": "$username"}
            }},
            {"$project": {
                "mwe_type": "$_id",
                "count": 1,
                "unique_phrases_count": {"$size": "$unique_phrases"},
                "unique_annotators_count": {"$size": "$unique_annotators"},
                "_id": 0
            }},
            {"$sort": {"count": -1}}
        ]))
        
        # Get project statistics
        project_stats = list(projects_collection.aggregate([
            {"$lookup": {
                "from": "sentences",
                "localField": "_id",
                "foreignField": "project_id",
                "as": "project_sentences"
            }},
            {"$project": {
                "project_name": "$name",
                "language": 1,
                "description": 1,
                "created_at": 1,
                "total_sentences": {"$size": "$project_sentences"},
                "annotated_sentences": {
                    "$size": {
                        "$filter": {
                            "input": "$project_sentences",
                            "as": "sentence",
                            "cond": {"$eq": ["$$sentence.is_annotated", True]}
                        }
                    }
                },
                "completion_rate": {
                    "$cond": [
                        {"$eq": [{"$size": "$project_sentences"}, 0]},
                        0,
                        {
                            "$divide": [
                                {"$size": {
                                    "$filter": {
                                        "input": "$project_sentences",
                                        "as": "sentence",
                                        "cond": {"$eq": ["$$sentence.is_annotated", True]}
                                    }
                                }},
                                {"$size": "$project_sentences"}
                            ]
                        }
                    ]
                }
            }},
            {"$sort": {"created_at": -1}}
        ]))
        
        if report_type.lower() == "csv":
            # Generate CSV report
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Summary section
            writer.writerow(["SENTENCE ANNOTATION SYSTEM - ANALYTICS REPORT"])
            writer.writerow(["Generated on:", datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")])
            writer.writerow([])
            writer.writerow(["OVERALL STATISTICS"])
            writer.writerow(["Total Sentences", total_sentences])
            writer.writerow(["Annotated Sentences", annotated_sentences])
            writer.writerow(["Annotation Rate", f"{(annotated_sentences/total_sentences*100):.1f}%" if total_sentences > 0 else "0%"])
            writer.writerow(["Total MWE Annotations", total_annotations])
            writer.writerow([])
            
            # User statistics
            writer.writerow(["USER STATISTICS"])
            writer.writerow(["Username", "Full Name", "Role", "Organization", "Total Sentences", "Annotated Sentences", "Total Annotations", "Approval Rate"])
            for user in user_stats:
                writer.writerow([
                    user["username"],
                    user.get("full_name", "N/A"),
                    user.get("role", "N/A"),
                    user.get("organization", "N/A"),
                    user["total_sentences"],
                    user["annotated_sentences"],
                    user["total_annotations"],
                    f"{(user['approval_rate']*100):.1f}%" if user['approval_rate'] > 0 else "0%"
                ])
            writer.writerow([])
            
            # MWE statistics
            writer.writerow(["MWE TYPE STATISTICS"])
            writer.writerow(["MWE Type", "Count", "Unique Phrases", "Unique Annotators"])
            for mwe in mwe_stats:
                writer.writerow([
                    mwe["mwe_type"],
                    mwe["count"],
                    mwe["unique_phrases_count"],
                    mwe["unique_annotators_count"]
                ])
            writer.writerow([])
            
            # Project statistics
            writer.writerow(["PROJECT STATISTICS"])
            writer.writerow(["Project Name", "Language", "Total Sentences", "Annotated Sentences", "Completion Rate", "Created Date"])
            for project in project_stats:
                writer.writerow([
                    project["project_name"],
                    project.get("language", "Unknown"),
                    project["total_sentences"],
                    project["annotated_sentences"],
                    f"{(project['completion_rate']*100):.1f}%" if project['completion_rate'] > 0 else "0%",
                    project["created_at"].strftime("%Y-%m-%d") if project.get("created_at") else "N/A"
                ])
            
            response = Response(output.getvalue(), mimetype='text/csv')
            response.headers["Content-Disposition"] = "attachment; filename=annotation_analytics_report.csv"
            return response
            
        else:
            # For PDF reports, you would typically use a library like ReportLab
            # Here's a basic implementation that returns JSON for PDF generation on frontend
            return jsonify({
                "summary": {
                    "total_sentences": total_sentences,
                    "annotated_sentences": annotated_sentences,
                    "annotation_rate": (annotated_sentences/total_sentences*100) if total_sentences > 0 else 0,
                    "total_annotations": total_annotations,
                    "report_generated": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
                },
                "user_statistics": user_stats,
                "mwe_statistics": mwe_stats,
                "project_statistics": project_stats
            }), 200
            
    except Exception as e:
        print(f"Error generating analytics report: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/analytics/annotation-timeline", methods=["GET"])
def get_annotation_timeline():
    """Get annotation activity over time for timeline visualization"""
    try:
        pipeline = [
            {"$group": {
                "_id": {
                    "year": {"$year": "$annotation_date"},
                    "month": {"$month": "$annotation_date"},
                    "day": {"$dayOfMonth": "$annotation_date"}
                },
                "count": {"$sum": 1},
                "unique_annotators": {"$addToSet": "$username"},
                "mwe_types": {"$addToSet": "$tag"}
            }},
            {"$project": {
                "date": {
                    "$dateFromParts": {
                        "year": "$_id.year",
                        "month": "$_id.month",
                        "day": "$_id.day"
                    }
                },
                "count": 1,
                "unique_annotators_count": {"$size": "$unique_annotators"},
                "unique_mwe_types": {"$size": "$mwe_types"},
                "_id": 0
            }},
            {"$sort": {"date": 1}}
        ]
        
        timeline_data = list(tags_collection.aggregate(pipeline))
        
        # Format dates for frontend
        for item in timeline_data:
            if isinstance(item["date"], datetime):
                item["date"] = item["date"].strftime("%Y-%m-%d")
        
        return jsonify(timeline_data), 200
        
    except Exception as e:
        print(f"Error fetching annotation timeline: {e}")
        return jsonify({"error": "Internal server error"}), 500
   
# --- Project Management Endpoints (UNCHANGED) ---

@app.route("/api/projects", methods=["POST"])
def create_project():
    try:
        file = request.files.get('file')
        project_name = request.form.get('projectName')
        project_description = request.form.get('projectDescription')  # NEW: Get description
        language = request.form.get('language')  # NEW: Get language
        assigned_user = request.form.get('assignedUser')
        sentence_range = request.form.get('sentenceRange') 
        admin_username = request.form.get('adminUsername')

        if not project_name or not assigned_user or not admin_username:
            return jsonify({"error": "Missing project name, assigned user, or admin username."}), 400

        is_file_upload = file is not None and file.filename != ''
        
        if not is_file_upload:
            return jsonify({"error": "Missing file. Please upload a sentence file."}), 400

        # 2. Extract sentences and metadata based on the data source (FILE)
        file_extension = os.path.splitext(file.filename)[1].lower()
        if file_extension not in ['.txt', '.pdf', '.doc', '.docx', '.csv', '.xml']:
            return jsonify({"error": "Unsupported file type. Use TXT, PDF, DOC/DOCX, CSV, or XML."}), 400
        
        all_sentences_data = extract_text_from_file(file, file_extension)
        
        if not all_sentences_data:
            return jsonify({"error": "No valid sentences found in the file"}), 400
        
        project_tasks_data = all_sentences_data

        # 3. Create project document - NOW INCLUDING DESCRIPTION AND LANGUAGE
        project_doc = projects_collection.insert_one({
            "name": project_name,
            "description": project_description or "",  # NEW: Store description
            "language": language or "Unknown",  # NEW: Store language
            "total_sentences": len(project_tasks_data),
            "file_name": file.filename if is_file_upload else None,
            "uploaded_by": admin_username,
            "created_at": datetime.utcnow()
        })
        project_id = str(project_doc.inserted_id)

        # 4. Insert tasks (sentences) and corresponding tags
        tags_to_insert = []
        
        for index, task_data in enumerate(project_tasks_data):
            sentence_text = task_data['textContent'].strip()
            
            if sentence_text:
                new_sentence_doc = {
                    "username": assigned_user,
                    "textContent": sentence_text,
                    "is_annotated": task_data.get('is_annotated', False),
                    "annotation_tags": [], 
                    "annotation_email": None,
                    "annotation_datetime": None,
                    "project_id": project_id, 
                    "original_index": index 
                }

                inserted_sentence_result = sentences_collection.insert_one(new_sentence_doc)
                new_sentence_id = str(inserted_sentence_result.inserted_id)
                
                # If the task came pre-annotated (e.g., from XML or annotated TXT), insert the tags
                if task_data.get('is_annotated', False) and task_data.get('tags'):
                    for tag in task_data['tags']:
                        # PRESERVE original annotation metadata
                        annotated_by_user = tag.get('annotated_by', assigned_user)
                        
                        # Try to use the original annotation date, fallback to current time
                        original_date = datetime.utcnow()
                        if tag.get('annotated_on'):
                            try:
                                # Parse the date from XML (format: YYYY-MM-DD)
                                original_date = datetime.strptime(tag['annotated_on'], '%Y-%m-%d')
                            except:
                                original_date = datetime.utcnow()
                        
                        tags_to_insert.append({
                            "username": annotated_by_user,  # Use the ORIGINAL annotator if available
                            "text": tag.get('text', sentence_text),
                            "tag": tag.get('tag', 'Concept'),
                            "source_sentence_id": new_sentence_id,
                            "annotation_date": original_date  # Use ORIGINAL date, not current time
                        })

        if tags_to_insert:
            tags_collection.insert_many(tags_to_insert)
            search_tags_collection.insert_many(tags_to_insert)

        log_action_and_update_report(admin_username, f'Created project "{project_name}" and assigned {len(project_tasks_data)} sentences to {assigned_user}')
        return jsonify({"message": f"Project '{project_name}' created and {len(project_tasks_data)} sentences assigned to {assigned_user}"}), 201

    except ValueError as ve:
          return jsonify({"error": f"File parsing error: {str(ve)}"}), 400
    except Exception as e:
        print(f"Error creating project: {e}")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


@app.route("/api/projects/standalone", methods=["POST"])
def create_project_standalone_flask():
    """
    Creates a new Project using raw data (not file upload), and parses it 
    with the detailed XML and plain-text logic (standard English splitting).
    """
    data = request.json
    current_user = data.get('uploaded_by', 'system_user') # Assuming this comes from the request data now

    print("Creating Project (Standalone Logic)...")

    # 1. Create and add the new Project record
    project_doc = projects_collection.insert_one({
        "name": data.get('title', 'Untitled Project'),
        "description": data.get('description', ''),
        "language": data.get('language', 'Unknown'),
        "file_text": data.get('file_text', ''),
        "uploaded_by": current_user,
        "created_at": datetime.utcnow(),
        "total_sentences": 0 # Will be updated later if sentences are found
    })
    new_project_id = str(project_doc.inserted_id)
    
    file_text = data.get('file_text', '').strip()
    is_xml = file_text.startswith("<") and file_text.endswith(">")
    sentence_counter = 1
    tags_to_insert = []
    
    # --- XML Processing Block ---
    if is_xml:
        print("Detected XML input.") 
        try:
            # Note: Using xml.etree.ElementTree (ET) as in the original standalone function
            root = ET.fromstring(file_text) 
            print("XML Parsed Successfully.") 

            decoded_text = html.unescape(file_text)
            # Check for inline annotations (OLD format)
            contains_inline_annotations = re.search(r'<(TIMEX|NUMEX)', decoded_text) is not None

            # --- OLD XML Format (Inline Annotations) ---
            if contains_inline_annotations:
                print("Detected inline annotations. Processing OLD XML format.")
                for sentence_elem in root.findall(".//sentence"):
                    raw_text = sentence_elem.get("text", "").strip()
                    is_annotated = sentence_elem.get("isAnnotated") == "True"
                    annotations = []

                    def annotation_extractor(match):
                        annotation_type = match.group(1)
                        attributes = match.group(2)
                        annotated_word = html.unescape(match.group(3))

                        annotation_attrs = dict(re.findall(r'(\w+)="(.*?)"', attributes))
                        annotations.append({
                            'type': annotation_type,
                            'text': annotated_word,
                            'attributes': annotation_attrs
                        })
                        return annotated_word

                    # Remove inline annotation tags and extract data
                    clean_text = re.sub(r'<(\w+)(.*?)>(.*?)</\1>', annotation_extractor, decoded_text)
                    
                    if clean_text:
                        # Save the Sentence record
                        new_sentence_doc = {
                            "username": current_user, # Assign to the user who uploaded the data
                            "textContent": clean_text,
                            "is_annotated": is_annotated,
                            "annotation_email": data.get('email'),
                            "annotation_datetime": datetime.utcnow() if is_annotated else None,
                            "project_id": new_project_id, 
                            "original_index": sentence_counter 
                        }
                        inserted_sentence_result = sentences_collection.insert_one(new_sentence_doc)
                        new_sentence_id = str(inserted_sentence_result.inserted_id)

                        # Save the Annotation records
                        if is_annotated:
                            for annotation in annotations:
                                annotation_type = annotation['type']
                                annotation_subtype = annotation['attributes'].get('TYPE', '')
                                annotated_word = annotation['text']
                                
                                tags_to_insert.append({
                                    "username": current_user,
                                    "text": annotated_word,
                                    "tag": f"{annotation_type} ({annotation_subtype})",
                                    "source_sentence_id": new_sentence_id,
                                    "annotation_date": datetime.utcnow()
                                })

                        sentence_counter += 1

            # --- NEW XML Format (Nested Annotations) ---
            else:
                print("Processing NEW Annotated XML format.") 
                sentences_root = root.find("./sentences")
                if sentences_root is None:
                    raise ValueError("Invalid XML: <sentences> tag missing inside <project>.")
                
                for sentence_elem in sentences_root.findall(".//sentence"):
                    raw_text = sentence_elem.get("text", "").strip()
                    is_annotated = sentence_elem.get("isAnnotated") == "True"
                    
                    if raw_text:
                        new_sentence_doc = {
                            "username": current_user,
                            "textContent": raw_text,
                            "is_annotated": is_annotated,
                            "annotation_email": data.get('email'),
                            "annotation_datetime": datetime.utcnow() if is_annotated else None,
                            "project_id": new_project_id,
                            "original_index": sentence_counter
                        }
                        inserted_sentence_result = sentences_collection.insert_one(new_sentence_doc)
                        new_sentence_id = str(inserted_sentence_result.inserted_id)

                        annotations_elem = sentence_elem.find("annotations")
                        if annotations_elem is not None:
                            for annotation_elem in annotations_elem.findall("annotation"):
                                annotated_word = annotation_elem.get("word_phrase")
                                annotation_type = annotation_elem.get("annotation")
                                annotated_by_xml = annotation_elem.get("annotated_by")
                                annotated_on_str = annotation_elem.get("annotated_on")
                                
                                # Convert date string to datetime object
                                try:
                                    annotated_on_dt = datetime.strptime(annotated_on_str, "%Y-%m-%d")
                                except:
                                    annotated_on_dt = datetime.utcnow()

                                tags_to_insert.append({
                                    "username": current_user, 
                                    "text": annotated_word,
                                    "tag": annotation_type,
                                    "source_sentence_id": new_sentence_id,
                                    "annotation_date": annotated_on_dt
                                })
                        
                        sentence_counter += 1

        except ET.ParseError as e:
            # Need to manually clean up the created project document
            projects_collection.delete_one({"_id": ObjectId(new_project_id)})
            return jsonify({'message': f'Invalid XML format: {str(e)}'}), 400
        except Exception as e:
            projects_collection.delete_one({"_id": ObjectId(new_project_id)})
            return jsonify({'message': f'An unexpected error occurred: {str(e)}'}), 500
    
    # --- Plain Text Processing Block (Standard Punctuation Split) ---
    else:
        print("Detected Plain Text input.")

        # Standard sentence splitting for English
        sentences = re.split(r'[।|॥|\.|\?|!]\s*', file_text)

        for sentence_text in sentences:
            clean_text = sentence_text.strip()
            if clean_text:
                new_sentence_doc = {
                    "username": current_user,
                    "textContent": clean_text,
                    "is_annotated": False,
                    "annotation_email": None,
                    "annotation_datetime": None,
                    "project_id": new_project_id,
                    "original_index": sentence_counter
                }
                sentences_collection.insert_one(new_sentence_doc)
                sentence_counter += 1
    
    # Final steps (Bulk insert tags and update project count)
    if tags_to_insert:
        tags_collection.insert_many(tags_to_insert)
        search_tags_collection.insert_many(tags_to_insert)

    projects_collection.update_one(
        {"_id": ObjectId(new_project_id)},
        {"$set": {"total_sentences": sentence_counter - 1}}
    )

    print("Project Successfully Created!") 
    return jsonify({"message": f"Project created successfully with {sentence_counter - 1} sentences."}), 201



@app.route("/api/projects", methods=["GET"])
def get_projects():
    """
    FIXED: Correctly counts unique sentences and annotations per project
    """
    try:
        # Step 1: Get all project metadata
        projects_cursor = projects_collection.find({}, {
            "name": 1,
            "description": 1,
            "language": 1,
            "created_at": 1
        }).sort("created_at", -1)
        
        projects_map = {str(p["_id"]): p for p in projects_cursor}
        project_ids = list(projects_map.keys())
        
        if not project_ids:
            return jsonify([]), 200

        # Step 2: CORRECTED Aggregation Pipeline
        pipeline = [
            # Match only sentences belonging to the active projects
            {"$match": {"project_id": {"$in": project_ids}}},
            
            # Group by project_id AND original_index to get unique sentences
            {"$group": {
                "_id": {
                    "project_id": "$project_id",
                    "original_index": "$original_index"
                },
                # For each unique sentence, check if ANY copy is annotated
                "is_annotated_any": {"$max": {"$cond": ["$is_annotated", 1, 0]}},
                "project_id": {"$first": "$project_id"}
            }},
            
            # Now group by project_id to get final counts
            {"$group": {
                "_id": "$project_id",
                "total_sentences": {"$sum": 1},
                "annotated_count": {"$sum": "$is_annotated_any"}
            }},
            
            # Add fields to structure the output
            {"$addFields": {
                "project_id": "$_id"
            }}
        ]
        
        # Execute the aggregation
        stats_results = {item['project_id']: item for item in sentences_collection.aggregate(pipeline)}
        
        projects_list = []
        
        # Step 3: Combine metadata with calculated statistics
        for project_id, project in projects_map.items():
            stats = stats_results.get(project_id, {})
            total_sentences = stats.get("total_sentences", 0)
            annotated_count = stats.get("annotated_count", 0)
            
            progress_percent = math.ceil((annotated_count / total_sentences) * 100) if total_sentences > 0 else 0
            
            # Get assigned users for this project
            assigned_users = sentences_collection.distinct("username", {"project_id": project_id})
            
            projects_list.append({
                "id": project_id,
                "name": project["name"],
                "description": project.get("description", "No description provided."),
                "language": project.get("language", "N/A"),
                "assigned_users_count": len(assigned_users),
                "total_sentences": total_sentences,
                "annotated_count": annotated_count,
                "not_annotated_count": total_sentences - annotated_count, 
                "progress_percent": progress_percent,
                "assigned_user": assigned_users[0] if assigned_users else 'N/A',  # Show first user as primary
                "assigned_users": assigned_users,  # Include all assigned users
                "done": annotated_count,  # For the project card display (e.g., "2/72")
                "total": total_sentences   # For the project card display
            })
            
        return jsonify(projects_list), 200
        
    except Exception as e:
        print(f"Error fetching projects (CORRECTED): {e}")
        return jsonify({"error": "Internal server error during project fetch"}), 500
 
   
@app.route("/api/projects/<project_id>/assign_user", methods=["POST"])
def assign_user_to_project(project_id):
    data = request.json
    new_users = data.get("users", [])
    admin_username = data.get("adminUsername")

    if not new_users:
        return jsonify({"error": "No users selected for assignment."}), 400

    project = projects_collection.find_one({"_id": ObjectId(project_id)})
    if not project:
        return jsonify({"error": "Project not found"}), 404

    try:
        # 1. Find the existing set of unique tasks and their annotation status from the current pool.
        # This ensures consistency across assignments.
        unique_tasks_cursor = sentences_collection.find({
            "project_id": project_id
        }, {
            "textContent": 1, 
            "original_index": 1,
            "is_annotated": 1, 
            "_id": 1 
        })

        tasks_pool = {}
        for task in unique_tasks_cursor:
            idx = task['original_index']
            
            # Consolidate status: Prioritize 'annotated' status if multiple copies exist for the same task index
            if idx not in tasks_pool or task.get('is_annotated'):
                tasks_pool[idx] = {
                    "textContent": task["textContent"],
                    "original_index": idx,
                    "is_annotated_in_pool": task.get('is_annotated', False),
                    "original_sentence_id": str(task['_id']) if task.get('is_annotated') else None
                }
        
        tasks_to_assign = list(tasks_pool.values())
        
        if not tasks_to_assign:
            return jsonify({"message": f"Project '{project['name']}' has no sentences to assign."}), 200

        # 2. Map tags from the original annotated sentences for duplication
        tag_map = {}
        annotated_task_ids = [t['original_sentence_id'] for t in tasks_to_assign if t['is_annotated_in_pool'] and t['original_sentence_id'] is not None]
        
        if annotated_task_ids:
            for tag in tags_collection.find({"source_sentence_id": {"$in": annotated_task_ids}}):
                old_sentence_id = tag['source_sentence_id']
                if old_sentence_id not in tag_map:
                    tag_map[old_sentence_id] = []
                
                # Prepare the tag document for duplication (remove _id and username)
                new_tag = {k: v for k, v in tag.items() if k not in ['_id', 'source_sentence_id', 'username']}
                tag_map[old_sentence_id].append(new_tag)


        inserted_count = 0
        tags_to_insert = []
        
        for user_to_assign in new_users:
            for task in tasks_to_assign:
                
                # Check if this specific task is already assigned to the user
                exists = sentences_collection.find_one({
                    "project_id": project_id,
                    "username": user_to_assign,
                    "original_index": task["original_index"]
                })
                
                if not exists:
                    is_annotated_for_new_user = task['is_annotated_in_pool']

                    # Insert the new sentence document to get the new MongoDB ID
                    new_sentence_template = {
                        "username": user_to_assign,
                        "textContent": task["textContent"],
                        "is_annotated": is_annotated_for_new_user, 
                        "annotation_tags": [], 
                        "annotation_email": None,
                        "annotation_datetime": None,
                        "project_id": project_id,
                        "original_index": task["original_index"]
                    }
                    
                    inserted_sentence_doc = sentences_collection.insert_one(new_sentence_template)
                    new_sentence_id = str(inserted_sentence_doc.inserted_id)
                    inserted_count += 1
                    
                    # If the original task was annotated, duplicate the tags
                    if is_annotated_for_new_user and task.get('original_sentence_id'):
                        old_sentence_id = task['original_sentence_id']
                        
                        if old_sentence_id in tag_map:
                            for tag_template in tag_map[old_sentence_id]:
                                # Duplicate tag and link it to the new sentence ID and new username
                                tags_to_insert.append({
                                    **tag_template,
                                    'source_sentence_id': new_sentence_id,
                                    'username': user_to_assign, # Set the correct NEW username
                                    'annotation_date': datetime.utcnow()
                                })

        if tags_to_insert:
            # Perform bulk insertion of all new tags after sentence creation
            tags_collection.insert_many(tags_to_insert)
            search_tags_collection.insert_many(tags_to_insert)

        log_action_and_update_report(admin_username, f'Assigned project "{project["name"]}" to {len(new_users)} users. Reflected existing pool progress.')
        return jsonify({"message": f"Successfully assigned {len(new_users)} user(s) with {inserted_count} new tasks and tags."}), 201

    except Exception as e:
        print(f"Error assigning user to project: {e}")
        return jsonify({"error": f"Failed to assign user due to server error: {str(e)}", "message": "Assignment failed to fetch"}), 500


@app.route("/api/projects/<project_id>/download", methods=["GET"])
def download_project_data(project_id):
    target_username = request.args.get("user")
    file_format = request.args.get("format", "Text")

    if not target_username:
        return jsonify({"error": "Target username is required for download."}), 400

    try:
        project = projects_collection.find_one({"_id": ObjectId(project_id)})
        if not project:
            return jsonify({"error": "Project not found."}), 404
        
        # Fetch target user's email robustly for the text export header
        user_doc = users_collection.find_one({"username": target_username})
        # Use the actual email from the user doc for the 'Annotated by' field
        annotator_email = user_doc.get("email", "unknown_email") if user_doc else "unknown_email"
        
        # Fetch all sentences and their tags
        pipeline = [
            {"$match": {"project_id": project_id, "username": target_username}},
            # CRITICAL FIX: Convert ObjectId to String for correct lookup join
            {"$addFields": {
                "sentenceIdString": {"$toString": "$_id"}
            }},
            {"$lookup": {
                "from": "tags",
                "localField": "sentenceIdString", # Use the new string field
                "foreignField": "source_sentence_id",
                "as": "annotations"
            }},
            {"$sort": {"original_index": 1}}
        ]
        annotated_sentences = list(sentences_collection.aggregate(pipeline))

        if not annotated_sentences:
            return jsonify({"message": "No sentences assigned or processed found for this user/project."}), 404

        # --- TXT Export Format (EXACT FORMAT REQUESTED) ---
        if file_format.upper() == "TEXT":
            output = io.StringIO()
            output_lines = []
            
            # IST timezone for annotation time display
            IST = ZoneInfo("Asia/Kolkata")
            
            for sentence in annotated_sentences:
                is_annotated = sentence.get("is_annotated", False)
                sentence_id = str(sentence["_id"])
                
                # Use repr() to safely escape and enclose text content
                text_content = repr(sentence["textContent"]) 
                
                # Line 1: Sentence ID and Text
                output_lines.append(f"Sentence ID: {sentence_id}, Text: {text_content}")

                if is_annotated:
                    # Collect all annotations for this sentence to print below the text
                    for tag_doc in sentence.get('annotations', []):
                        # Annotation details: Tag, Word/Phrase, Annotated by, Annotated on
                        tag_text = tag_doc.get('text', '').strip()
                        tag_label = tag_doc.get('tag', 'UNKNOWN_TAG')
                        
                        # Date Formatting
                        annotation_dt_utc = tag_doc.get("annotation_date", datetime.utcnow())
                        if isinstance(annotation_dt_utc, str):
                            try:
                                # Attempt to parse ISO format if stored as string
                                annotation_dt_utc = datetime.fromisoformat(annotation_dt_utc.replace('Z', '+00:00'))
                            except:
                                annotation_dt_utc = datetime.utcnow()
                        
                        # Ensure datetime is timezone-aware for conversion
                        if annotation_dt_utc.tzinfo is None or annotation_dt_utc.tzinfo.utcoffset(annotation_dt_utc) is None:
                             annotation_dt_utc = annotation_dt_utc.replace(tzinfo=ZoneInfo("UTC"))
                             
                        annotation_dt_ist = annotation_dt_utc.astimezone(IST)
                        annotation_dt_str = annotation_dt_ist.strftime('%Y-%m-%d') # Only date as requested (YYYY-MM-DD)

                        # Line 2: Tab-indented annotation details (EXACT FORMAT)
                        output_lines.append(
                            f"\tAnnotation: {tag_label}, Word_Phrase: '{tag_text}', Annotated by: {annotator_email}, Annotated on: {annotation_dt_str}"
                        )

                output_lines.append("") # Empty line for separation

            output.write('\n'.join(output_lines))

            response = Response(output.getvalue(), mimetype='text/plain')
            response.headers["Content-Disposition"] = f"attachment; filename={project['name']}_{target_username}_annotations.txt"
            return response

        # --- XML Export Format (EXACT FORMAT REQUESTED) ---
        elif file_format.upper() == "XML":
            
            all_user_sentences_cursor = sentences_collection.find({
                "project_id": project_id, 
                "username": target_username
            }).sort("original_index", 1)
            
            all_user_sentences = list(all_user_sentences_cursor)
            
            root = etree.Element("project")
            sentences_tag = etree.SubElement(root, "sentences")
            
            annotation_map = {}
            sentence_ids = [str(s["_id"]) for s in all_user_sentences]
            
            # Fetch and format all tags
            for tag in tags_collection.find({"source_sentence_id": {"$in": sentence_ids}}):
                sid = tag.get("source_sentence_id")
                if sid:
                    if sid not in annotation_map:
                        annotation_map[sid] = []
                    
                    # Format annotation date as YYYY-MM-DD
                    annotated_on_date = tag.get('annotation_date', datetime.utcnow()).strftime('%Y-%m-%d')
                    
                    annotation_map[sid].append({
                        "id": str(tag["_id"]),
                        "word_phrase": tag['text'],
                        "annotation": tag['tag'],
                        "annotated_by": tag.get('username'), 
                        "annotated_on": annotated_on_date
                    }) 
            
            for sentence in all_user_sentences:
                project_id_str = sentence.get("project_id", project_id) 
                
                # EXACT ATTRIBUTES and NAMESPACE
                sentence_tag = etree.SubElement(
                    sentences_tag, 
                    "sentence", 
                    id=str(sentence["_id"]),
                    text=sentence["textContent"], 
                    isAnnotated="True" if sentence.get("is_annotated") else "False", 
                    project_id=project_id_str 
                )
                
                annotations_tag = etree.SubElement(sentence_tag, "annotations")
                
                # Add annotations if they exist
                tags_data = annotation_map.get(str(sentence["_id"]), [])
                
                for tag_doc in tags_data:
                    # EXACT TAG and ATTRIBUTES
                    etree.SubElement(
                        annotations_tag, 
                        "annotation", 
                        id=tag_doc['id'],
                        word_phrase=tag_doc['word_phrase'],
                        annotation=tag_doc['annotation'],
                        annotated_by=tag_doc['annotated_by'],
                        annotated_on=tag_doc['annotated_on']
                    )

            xml_string = etree.tostring(root, pretty_print=True, xml_declaration=True, encoding='UTF-8')
            
            response = Response(xml_string, mimetype='application/xml')
            response.headers["Content-Disposition"] = f"attachment; filename={project['name']}_{target_username}_xml_export.xml"
            return response


        return jsonify({"error": "Invalid file format requested. Use 'Text' or 'XML'."}), 400

    except Exception as e:
        # CRITICAL: Log the error and return a JSON failure response to prevent HTML output
        print(f"Backend CRASH during download: {e}")
        return jsonify({"error": f"Download processing failed due to server error: {str(e)}"}), 500


@app.route("/sentences/<username>", methods=["GET"])
def get_sentences(username):
    """
    Fetches ALL sentences assigned to the user, separated into 
    'ad_hoc' and 'project_tasks' for the User Dashboard (Dashboard.js).
    """
    ad_hoc_sentences = []
    project_tasks = {}
    
    # Fetch all sentences assigned to the user
    for s in sentences_collection.find({"username": username}).sort([("project_id", 1), ("original_index", 1)]):
        
        # Prepare sentence data
        sentence_data = {
            "is_annotated": s.get("is_annotated", False),
            "_id": str(s["_id"]),
            "textContent": s["textContent"],
            "project_id": s.get("project_id"),
            "original_index": s.get("original_index")
        }
        
        project_id = s.get("project_id")
        
        if project_id is None:
            ad_hoc_sentences.append(sentence_data)
        else:
            project_id_str = str(project_id) # Ensure key is always a string
            
            # Fetch project name only once
            if project_id_str not in project_tasks:
                project_doc = None
                try:
                    project_doc = projects_collection.find_one({"_id": ObjectId(project_id_str)}, {"name": 1})
                except:
                    project_doc = projects_collection.find_one({"_id": project_id_str}, {"name": 1})

                project_name = project_doc['name'] if project_doc else "Unknown Project"
                
                # Initialize the structure expected by the frontend's project cards (Dashboard.js)
                project_tasks[project_id_str] = {
                    "project_name": project_name,
                    "sentences": [],
                    "total": 0,    # Will be updated below
                    "completed": 0 # Will be updated below
                }
            
            # Add sentence to the corresponding project group
            project_tasks[project_id_str]["sentences"].append(sentence_data)
            project_tasks[project_id_str]["total"] += 1
            if sentence_data["is_annotated"]:
                project_tasks[project_id_str]["completed"] += 1

    # Convert dictionary of projects into a list for JSON output
    project_tasks_list = list(project_tasks.values())
    
    # Return separated data structure
    return jsonify({
        "ad_hoc_sentences": ad_hoc_sentences,
        "project_tasks": project_tasks_list
    })

@app.route("/api/projects/<project_id>/users_and_progress", methods=["GET"])
def get_project_users_and_progress(project_id):
    try:
        try:
            project = projects_collection.find_one({"_id": ObjectId(project_id)})
        except:
            project = None
        
        if not project:
            return jsonify({"error": "Project not found"}), 404

        # Group sentences by username to get individual progress
        pipeline = [
            {"$match": {"project_id": project_id}},
            {"$group": {
                "_id": "$username",
                "total": {"$sum": 1},
                "completed": {"$sum": {"$cond": ["$is_annotated", 1, 0]}}
            }},
            {"$project": {
                "username": "$_id",
                "total": 1,
                "completed": 1,
                "_id": 0
            }}
        ]
        
        user_progress = list(sentences_collection.aggregate(pipeline))

        return jsonify({
            "project_name": project.get("name"),
            "users": user_progress
        }), 200

    except Exception as e:
        print(f"Error fetching project user progress: {e}")
        return jsonify({"error": "Internal server error"}), 500
   
    
@app.route("/api/projects/<project_id>", methods=["DELETE"])
def delete_project(project_id):
    try:
        project_oid = ObjectId(project_id)
        project = projects_collection.find_one({"_id": project_oid})
        if not project:
            return jsonify({"message": "Project not found"}), 404

        project_string_id = str(project["_id"])

        # 1️⃣ Find all sentence IDs for this project
        sentences_to_delete = list(sentences_collection.find(
            {"project_id": project_string_id}, {"_id": 1}
        ))
        sentence_ids = [str(s["_id"]) for s in sentences_to_delete]

        # 2️⃣ Delete associated tags
        if sentence_ids:
            tags_collection.delete_many({"source_sentence_id": {"$in": sentence_ids}})
            search_tags_collection.delete_many({"source_sentence_id": {"$in": sentence_ids}})

        # 3️⃣ Delete all sentences for this project
        sentences_collection.delete_many({"project_id": project_string_id})

        # 4️⃣ Delete the project itself
        projects_collection.delete_one({"_id": project_oid})

        return jsonify({"message": f"Project '{project['name']}' and related data deleted successfully."}), 200
    except Exception as e:
        print(f"Error deleting project: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/projects/<project_id>", methods=["PUT"])
def update_project(project_id):
    """Update project details (name, description, language) and reassign to users"""
    try:
        data = request.json
        admin_username = data.get("adminUsername")
        
        if not admin_username:
            return jsonify({"error": "Admin username is required"}), 400

        # Find the project
        project = projects_collection.find_one({"_id": ObjectId(project_id)})
        if not project:
            return jsonify({"error": "Project not found"}), 404

        # Prepare update fields
        update_fields = {}
        if "name" in data:
            update_fields["name"] = data["name"]
        if "description" in data:
            update_fields["description"] = data["description"]
        if "language" in data:
            update_fields["language"] = data["language"]

        # Update project details
        if update_fields:
            projects_collection.update_one(
                {"_id": ObjectId(project_id)},
                {"$set": update_fields}
            )

        # Handle user reassignment if provided
        new_users = data.get("assigned_users", [])
        users_to_remove = data.get("users_to_remove", [])
        
        if new_users:
            # Assign new users to the project
            for username in new_users:
                # Check if user already has assignments for this project
                existing_assignments = sentences_collection.count_documents({
                    "project_id": project_id,
                    "username": username
                })
                
                if existing_assignments == 0:
                    # Get unique sentences from the project
                    unique_sentences = list(sentences_collection.aggregate([
                        {"$match": {"project_id": project_id}},
                        {"$group": {
                            "_id": {
                                "textContent": "$textContent",
                                "original_index": "$original_index"
                            },
                            "sentence_data": {"$first": "$$ROOT"}
                        }}
                    ]))
                    
                    # Create new assignments for the user
                    for unique_sentence in unique_sentences:
                        sentence_data = unique_sentence["sentence_data"]
                        new_sentence = {
                            "username": username,
                            "textContent": sentence_data["textContent"],
                            "is_annotated": False,  # New assignments start as unannotated
                            "annotation_tags": [],
                            "annotation_email": None,
                            "annotation_datetime": None,
                            "project_id": project_id,
                            "original_index": sentence_data.get("original_index")
                        }
                        sentences_collection.insert_one(new_sentence)

        # Remove users from project if specified
        if users_to_remove:
            for username in users_to_remove:
                # Find sentences to be removed
                sentences_to_delete = list(sentences_collection.find(
                    {"project_id": project_id, "username": username},
                    {"_id": 1}
                ))
                sentence_ids = [str(s["_id"]) for s in sentences_to_delete]
                
                # Delete sentences and associated tags
                sentences_collection.delete_many({
                    "project_id": project_id,
                    "username": username
                })
                
                if sentence_ids:
                    tags_collection.delete_many({"source_sentence_id": {"$in": sentence_ids}})
                    search_tags_collection.delete_many({"source_sentence_id": {"$in": sentence_ids}})

        # Log the action
        log_action_and_update_report(
            admin_username, 
            f"Updated project '{project['name']}' (ID: {project_id})"
        )

        return jsonify({"message": "Project updated successfully"}), 200

    except Exception as e:
        print(f"Error updating project: {e}")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500
 

@app.route("/api/projects/<project_id>/sentences", methods=["GET"])
def get_project_sentences(project_id):
    """
    Fetches sentences and their tags (BOTH final and staged) for a specific project ID and user.
    """
    try:
        project_name = "Unknown Project"
        try:
            project = projects_collection.find_one({"_id": ObjectId(project_id)})
            if project:
                project_name = project["name"]
        except:
            pass

        target_username = request.args.get("username")
        if not target_username:
            return jsonify({"error": "Target username is required for sentence review."}), 400
            
        print(f"DEBUG: Fetching sentences for project {project_id}, user {target_username}")
            
        # Fetch sentences with their FINAL tags
        pipeline = [
            {"$match": {
                "project_id": project_id, 
                "username": target_username
            }},
            {"$addFields": {
                "sentence_id_str": {"$toString": "$_id"}
            }},
            {"$lookup": {
                "from": "tags",
                "localField": "sentence_id_str",
                "foreignField": "source_sentence_id", 
                "as": "final_tags"
            }},
            {"$sort": {"original_index": 1}}
        ]
        
        project_sentences = []
        cursor = sentences_collection.aggregate(pipeline)
        
        for s in cursor:
            sentence_id_str = str(s["_id"])
            
            # Fetch STAGED tags for this sentence using your existing route logic
            staged_tags = list(staged_tags_collection.find({
                "source_sentence_id": sentence_id_str  # Note: using source_sentence_id, not sentence_id
            }))
            
            # Combine final tags and staged tags
            all_tags = []
            
            # Process final tags
            for tag in s.get("final_tags", []):
                tag_data = {
                    "text": tag.get("text", ""),
                    "tag": tag.get("tag", ""),
                    "username": tag.get("username", ""),
                    "annotation_date": tag.get("annotation_date"),
                    "mweId": tag.get("mweId"),
                    "_id": str(tag["_id"]),
                    "review_status": "Approved",  # Final tags are approved
                    "review_comments": tag.get("review_comments", "")
                }
                # Format date if present
                if tag_data["annotation_date"] and isinstance(tag_data["annotation_date"], datetime):
                    tag_data["annotated_on"] = tag_data["annotation_date"].strftime('%Y-%m-%d')
                all_tags.append(tag_data)
            
            # Process staged tags
            for tag in staged_tags:
                tag_data = {
                    "text": tag.get("text", ""),
                    "tag": tag.get("tag", ""),
                    "username": tag.get("username", ""),
                    "annotation_date": tag.get("annotation_date"),
                    "mweId": tag.get("mweId"),
                    "_id": str(tag["_id"]),
                    "review_status": "Pending",  # Staged tags are pending
                    "review_comments": tag.get("review_comments", "")
                }
                # Format date if present
                if tag_data["annotation_date"] and isinstance(tag_data["annotation_date"], datetime):
                    tag_data["annotated_on"] = tag_data["annotation_date"].strftime('%Y-%m-%d')
                all_tags.append(tag_data)
            
            # Convert MongoDB document to JSON-serializable format
            sentence_data = {
                "_id": str(s["_id"]),
                "textContent": s["textContent"],
                "is_annotated": s.get("is_annotated", False),
                "original_index": s.get("original_index"),
                "project_id": s.get("project_id"),
                "username": s.get("username"),
                "annotation_datetime": s.get("annotation_datetime"),
                "annotation_email": s.get("annotation_email"),
                "tags": all_tags,  # Now includes both final and staged tags
                "review_status": s.get("review_status", "Pending")
            }
            
            project_sentences.append(sentence_data)
            
        print(f"DEBUG: Found {len(project_sentences)} sentences with {sum(len(s['tags']) for s in project_sentences)} total tags")
            
        return jsonify({
            "project_name": project_name,
            "sentences": project_sentences
        }), 200
        
    except Exception as e:
        print(f"Error fetching project sentences for review: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Internal server error while fetching sentences: {str(e)}"}), 500
          
@app.route('/api/activity-logs/<username>', methods=["GET"])
def get_activity_logs(username):
    """Fetches activity history for the given username (admin required)."""
    try:
        user = users_collection.find_one({"username": username})
        if not user or user.get("role") != "admin":
            return jsonify({"message": "Unauthorized access"}), 403

        all_history = []
        # Loop through all users' session histories
        for user_doc in user_session_history_collection.find():
            for session in user_doc.get('sessions', []):
                all_history.append({
                    "id": f"{user_doc['username']}_{session.get('loginTimeIST', '')}",
                    "username": user_doc['username'],
                    **session
                })

        # Sort by login time, descending
        all_history.sort(key=lambda x: datetime.strptime(x['loginTimeIST'], '%d/%m/%Y, %H:%M:%S') if x['loginTimeIST'] else datetime.min, reverse=True)
        return jsonify(all_history)
        
    except Exception as e:
        print(f"Error fetching activity logs: {e}")
        return jsonify({"error": "Internal server error"}), 500
    
    
@app.route('/sentences/<sentence_id>/tags/<tag_id>', methods=['DELETE'])
def remove_tag_from_sentence(sentence_id, tag_id):
    try:
        result = tags_collection.delete_one({"_id": ObjectId(tag_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Tag not found"}), 404

        sentence = sentences_collection.find_one({"_id": ObjectId(sentence_id)})
        if sentence:
            username = sentence.get("username")
            log_action_and_update_report(username, f"Removed tag {tag_id} from sentence '{sentence.get('textContent','')}'")

        return jsonify({"message": "Tag removed successfully"}), 200
    except Exception as e:
        print(f"Error removing tag: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500
   
   
@app.route('/tags', methods=['POST'])
def add_or_update_tag():
    """
    MODIFIED: Annotator adds/updates a tag. It now ONLY writes to the staged_tags_collection.
    """
    try:
        data = request.get_json()
        required_fields = ['username', 'text', 'tag', 'sentenceId']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields in request'}), 400

        username = data['username']
        text = data['text']
        tag_label = data['tag']
        sentence_id = data['sentenceId']

        # Find existing staged tag to UPDATE it, or check if it exists in final (read-only for annotator)
        existing_tag = staged_tags_collection.find_one({
            'source_sentence_id': sentence_id, 
            'username': username,
            'text': text, 
            'tag': tag_label
        })

        tag_data = {
            'tag': tag_label,
            'source_sentence_id': sentence_id,
            'username': username,
            'text': text,
            'annotation_date': datetime.utcnow(),
            'status': 'Staged/Pending Review' 
        }

        if existing_tag:
             # Update the existing staged tag
            staged_tags_collection.update_one(
                {'_id': existing_tag['_id']},
                {'$set': tag_data}
            )
            message = 'Tag updated in staging successfully'
            status_code = 200
        else:
            # Insert a new staged tag
            staged_tags_collection.insert_one(tag_data)
            message = 'Tag created and staged successfully'
            status_code = 201
            
        # NOTE: Sentences status (is_annotated) is updated regardless of staging
        sentences_collection.update_one(
            {'_id': ObjectId(sentence_id)},
            {'$set': {
                'is_annotated': True,
                'annotation_email': username,
                'annotation_datetime': datetime.utcnow()
            }}
        )

        log_action_and_update_report(username, f"Staged tag '{text}' as '{tag_label}'")
        return jsonify({'message': message}), status_code
        
    except Exception as e:
        print(f"Error in /tags POST endpoint: {e}")
        return jsonify({'error': 'An internal server error occurred'}), 500

 
@app.route('/reviewer/sentence/<sentence_id>/tags', methods=['GET'])
def get_staged_tags_for_review(sentence_id):
    """
    Fetches all staged tags for a specific sentence ID for review.
    """
    try:
        # 1. Query the staged_tags collection for the sentence
        # We use the sentence_id provided in the URL path.
        staged_tags = list(staged_tags_collection.find({
            "sentence_id": sentence_id
        }))

        # 2. Prepare data for the frontend (convert ObjectId to string)
        for tag in staged_tags:
            # Convert MongoDB's ObjectId to a string for JSON serialization
            tag['_id'] = str(tag['_id'])
            
            # Ensure sentence_id is a string, if needed
            if 'sentence_id' in tag and not isinstance(tag['sentence_id'], str):
                 tag['sentence_id'] = str(tag['sentence_id'])

        return jsonify(staged_tags), 200

    except Exception as e:
        print(f"Error fetching staged tags for review: {e}")
        return jsonify({"error": "Internal server error during tag retrieval."}), 500


@app.route('/reviewer/tag/<tag_id>/approve', methods=['PUT'])
def approve_tag(tag_id):
    """
    Approves a staged tag: moves it from staged_tags_collection to tags_collection.
    """
    try:
        # CRITICAL: Find the staged tag using ObjectId
        staged_tag = staged_tags_collection.find_one({"_id": ObjectId(tag_id)})
        if not staged_tag:
            return jsonify({"message": "Staged tag not found or already reviewed."}), 404
        
        # 2. Prepare the final tag document (remove old ID for new insertion)
        final_tag = staged_tag
        final_tag.pop('_id') 
        
        # 3. Insert into final collection
        tags_collection.insert_one(final_tag)
        search_tags_collection.insert_one(final_tag) 
        
        # 4. Delete from staged collection
        staged_tags_collection.delete_one({"_id": ObjectId(tag_id)})
        
        # 5. Log action
        log_action_and_update_report(request.json.get('reviewerUsername', 'system'), 
                                     f"Approved tag '{final_tag.get('text')}' by {final_tag.get('username')}.")

        return jsonify({"message": "Tag approved and finalized successfully."}), 200

    except Exception as e:
        print(f"Error approving tag: {e}")
        # Ensure a clean JSON error response is returned
        return jsonify({"error": "Internal server error during tag approval."}), 500

@app.route('/reviewer/tag/<tag_id>/reject', methods=['DELETE'])
def reject_tag(tag_id):
    """
    Rejects a staged tag: deletes it directly from the staged_tags_collection.
    """
    try:
        # CRITICAL: Find the staged tag using ObjectId (for logging purposes)
        staged_tag = staged_tags_collection.find_one({"_id": ObjectId(tag_id)})
        if not staged_tag:
            return jsonify({"message": "Staged tag not found."}), 404
            
        # 2. Delete from staged collection
        staged_tags_collection.delete_one({"_id": ObjectId(tag_id)})
        
        # 3. Log action
        log_action_and_update_report(request.json.get('reviewerUsername', 'system'), 
                                     f"Rejected and deleted tag '{staged_tag.get('text')}' by {staged_tag.get('username')}.")

        return jsonify({"message": "Tag rejected and removed successfully."}), 200

    except Exception as e:
        print(f"Error rejecting tag: {e}")
        # Ensure a clean JSON error response is returned
        return jsonify({"error": "Internal server error during tag rejection."}), 500
    
    
@app.route('/tags/<username>', methods=['GET'])
def get_tags(username):
    """
    MODIFIED: Gets tags from the staged collection for the Annotator's view,
    BUT it returns ALL tags (staged + final) for search/autotagging completeness.
    """
    # NOTE: This endpoint needs to be very clear about its purpose.
    # We will return tags from BOTH collections for Autotagging/Search
    
    staged_tags = list(staged_tags_collection.find({'username': username}))
    final_tags = list(tags_collection.find({'username': username}))
    
    # Combine and convert IDs to string
    all_tags = staged_tags + final_tags
    user_tags = [{**tag, "_id": str(tag["_id"])} for tag in all_tags]
    
    return jsonify(user_tags)
    
@app.route("/sentences/<sentence_id>/status", methods=["PUT"])
def update_sentence_status(sentence_id):
    data = request.json
    new_status = data.get('is_annotated')
    username = data.get('username') 
    
    if new_status is None: return jsonify({"error": "is_annotated status is required"}), 400
    if not username: return jsonify({"error": "Username is required for status update and logging."}), 400
    
    update_fields = {"is_annotated": new_status}
    
    # Capture Annotated by (Email) and Annotation Date/Time upon annotation
    if new_status:
        user_doc = users_collection.find_one({"username": username})
        user_email = user_doc.get("email") if user_doc else None
        
        update_fields["annotation_email"] = user_email
        update_fields["annotation_datetime"] = datetime.utcnow() # Store UTC time
    else:
        # Clear metadata if un-annotating
        update_fields["annotation_email"] = None
        update_fields["annotation_datetime"] = None
        
    result = sentences_collection.update_one(
            {"_id": ObjectId(sentence_id)}, {"$set": update_fields}
        )
        
    if result.matched_count == 0: return jsonify({"message": "Sentence not found"}), 404
    
    # Log the action
    sentence = sentences_collection.find_one({"_id": ObjectId(sentence_id)})
    if sentence:
        status_text = "Yes" if new_status else "No"
        log_action_and_update_report(username, f"Marked sentence '{sentence['textContent']}' as Annotated: {status_text}")
        
    return jsonify({"message": "Status updated successfully"})

@app.route('/stats', methods=["GET"])
def get_stats():
    try:
        username_arg = request.args.get('username')
        user = users_collection.find_one({"username": username_arg})
        if not user or user.get("role") != "admin":
            return jsonify({"message": "Unauthorized access"}), 403

        # 1. Calculate stats based on UNIQUE sentences across all projects.
        pipeline = [
            {"$group": {
                "_id": {
                    "project_id": "$project_id", 
                    "original_index": "$original_index"
                },
                "is_annotated_status": {"$max": "$is_annotated"},
                "unique_sentence_id": {"$first": "$_id"}
            }},
            {"$group": {
                "_id": None,
                "total_unique_sentences": {"$sum": 1},
                "total_annotated": {"$sum": {"$cond": ["$is_annotated_status", 1, 0]}}
            }}
        ]

        stats_result = list(sentences_collection.aggregate(pipeline))
        
        if stats_result:
            stats = stats_result[0]
            total_sentences = stats.get("total_unique_sentences", 0)
            annotated_sentences = stats.get("total_annotated", 0)
        else:
            total_sentences = 0
            annotated_sentences = 0

        non_annotated_sentences = total_sentences - annotated_sentences

        # 2. Sentences by User
        user_counts = {}
        for user in users_collection.find():
            user_name = user['username']
            count = sentences_collection.count_documents({"username": user_name})
            user_counts[user_name] = count

        return jsonify({
            "total_sentences": total_sentences,
            "annotated_sentences": annotated_sentences,
            "non_annotated_sentences": non_annotated_sentences,
            "user_counts": user_counts
        })
        
    except Exception as e:
        print(f"Error in stats endpoint: {e}")
        return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5001)