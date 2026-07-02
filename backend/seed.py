import asyncio
import os
import random
import uuid
from datetime import datetime, timezone, timedelta
from server import db, hash_password, _now, _oid, put_object

def get_random_date(days_ago_start=30, days_ago_end=0):
    start = datetime.now(timezone.utc) - timedelta(days=days_ago_start)
    end = datetime.now(timezone.utc) - timedelta(days=days_ago_end)
    random_date = start + timedelta(seconds=random.randint(0, int((end - start).total_seconds())))
    return random_date.isoformat()

async def seed():
    print("Clearing collections...")
    await db.users.delete_many({})
    await db.clients.delete_many({})
    await db.cases.delete_many({})
    await db.tasks.delete_many({})
    await db.invoices.delete_many({})
    await db.messages.delete_many({})
    await db.appointments.delete_many({})
    await db.documents.delete_many({})

    print("Seeding Admin...")
    admin_id = (await db.users.insert_one({
        "email": "admin@lexcase.com",
        "password_hash": hash_password("Admin@123"),
        "name": "Admin User",
        "role": "admin",
        "created_at": _now()
    })).inserted_id

    print("Seeding Lawyers...")
    lawyers_data = [
        {"name": "Rahul Sharma", "email": "rahul@lexcase.com"},
        {"name": "Vikram Singh", "email": "vikram@lexcase.com"},
        {"name": "Ananya Patel", "email": "ananya@lexcase.com"},
        {"name": "Priya Desai", "email": "priya@lexcase.com"},
        {"name": "Amit Kumar", "email": "amit@lexcase.com"},
    ]
    lawyer_ids = []
    for ld in lawyers_data:
        uid = (await db.users.insert_one({
            "email": ld["email"],
            "password_hash": hash_password("Lawyer@123"),
            "name": ld["name"],
            "role": "lawyer",
            "created_at": _now()
        })).inserted_id
        lawyer_ids.append((uid, ld["name"]))



    clients_data = [
        {"name": "Ramesh Traders", "email": "contact@rameshtraders.com", "company": "Ramesh Traders Pvt Ltd", "phone": "9876543210"},
        {"name": "Kiran Enterprises", "email": "contact@kiranenterprises.com", "company": "Kiran Enterprises", "phone": "9876543211"},
        {"name": "Suresh Buildcon", "email": "contact@sureshbuildcon.com", "company": "Suresh Buildcon Ltd", "phone": "9876543212"},
        {"name": "Neha Logistics", "email": "contact@nehalogistics.com", "company": "Neha Logistics Corp", "phone": "9876543213"},
        {"name": "Rajesh Exports", "email": "contact@rajeshexports.com", "company": "Rajesh Exports Inc", "phone": "9876543214"},
        {"name": "Meera Textiles", "email": "contact@meeratextiles.com", "company": "Meera Textiles", "phone": "9876543215"},
        {"name": "Deepak FinServe", "email": "contact@deepakfinserve.com", "company": "Deepak Financial Services", "phone": "9876543216"},
        {"name": "Sunita Retail", "email": "contact@sunitaretail.com", "company": "Sunita Retail Chain", "phone": "9876543217"},
        {"name": "Anand Tech", "email": "contact@anandtech.com", "company": "Anand Technologies", "phone": "9876543218"},
        {"name": "Pooja Pharma", "email": "contact@poojapharma.com", "company": "Pooja Pharmaceuticals", "phone": "9876543219"},
    ]

    cases_info = [
        {"title": "Dispute with Supplier", "practice_area": "Litigation"},
        {"title": "Labor Law Compliance", "practice_area": "Corporate"},
        {"title": "Land Acquisition", "practice_area": "Real Estate"},
        {"title": "Transport License Renewal", "practice_area": "Regulatory"},
        {"title": "Export Tax Notice", "practice_area": "Tax"},
        {"title": "Trademark Registration", "practice_area": "Intellectual Property"},
        {"title": "Regulatory Audit", "practice_area": "Corporate"},
        {"title": "Lease Agreement Review", "practice_area": "Real Estate"},
        {"title": "IP Infringement Defense", "practice_area": "Intellectual Property"},
        {"title": "FDA Compliance", "practice_area": "Regulatory"},
    ]

    print("Seeding Clients, Cases, Tasks, Invoices, Messages, and Documents...")
    for i, c_data in enumerate(clients_data):
        client_id = (await db.clients.insert_one({
            "name": c_data["name"],
            "email": c_data["email"],
            "phone": c_data["phone"],
            "company": c_data["company"],
            "address": f"10{i} Business Park, Mumbai, India",
            "confidential": False,
            "notes": "Premium corporate client.",
            "created_at": _now(),
            "created_by": str(admin_id)
        })).inserted_id

        client_user_id = (await db.users.insert_one({
            "email": c_data["email"],
            "password_hash": hash_password("Client@123"),
            "name": c_data["name"],
            "role": "client",
            "client_id": str(client_id),
            "created_at": _now()
        })).inserted_id

        lawyer = lawyer_ids[i % len(lawyer_ids)]
        lawyer_uid = lawyer[0]
        lawyer_name = lawyer[1]

        case_info = cases_info[i]
        case_number = f"CASE-2026-{str(uuid.uuid4())[:6].upper()}"
        status_choice = random.choice(["open", "open", "open", "intake", "on_hold", "closed"])

        case_id = (await db.cases.insert_one({
            "title": case_info["title"],
            "case_number": case_number,
            "client_id": str(client_id),
            "practice_area": case_info["practice_area"],
            "status": status_choice,
            "priority": random.choice(["low", "medium", "high", "urgent"]),
            "description": f"Handling all legal matters pertaining to {case_info['title'].lower()} for {c_data['company']}.",
            "assigned_to": str(lawyer_uid),
            "opened_on": get_random_date(60, 10),
            "created_at": _now(),
            "updated_at": _now(),
            "created_by": str(admin_id)
        })).inserted_id

        # Tasks
        task_titles = [
            f"Review documents for {case_info['title']}",
            f"Draft initial legal notice for {c_data['name']}",
            f"Filing paperwork at the registrar",
            f"Client strategy meeting preparation"
        ]
        await db.tasks.insert_one({
            "title": task_titles[0],
            "case_id": str(case_id),
            "description": "Please ensure all initial documents are verified before proceeding.",
            "due_date": (datetime.now(timezone.utc) + timedelta(days=random.randint(-5, 15))).isoformat(),
            "priority": "high",
            "status": random.choice(["pending", "in_progress", "done"]),
            "assigned_to": str(lawyer_uid),
            "created_at": _now(),
            "created_by": str(admin_id)
        })
        if i % 2 == 0:
            await db.tasks.insert_one({
                "title": task_titles[1],
                "case_id": str(case_id),
                "description": "Drafting required.",
                "due_date": (datetime.now(timezone.utc) + timedelta(days=random.randint(1, 10))).isoformat(),
                "priority": "medium",
                "status": "pending",
                "assigned_to": str(lawyer_uid),
                "created_at": _now(),
                "created_by": str(admin_id)
            })

        # Invoice
        inv_status = random.choice(["paid", "unpaid", "unpaid", "overdue"])
        await db.invoices.insert_one({
            "client_id": str(client_id),
            "lawyer_id": str(lawyer_uid),
            "case_id": str(case_id),
            "amount": float(random.randint(20, 150) * 1000),
            "description": f"Legal Services - {case_info['title']}",
            "status": inv_status,
            "due_date": (datetime.now(timezone.utc) + timedelta(days=random.randint(-15, 30))).isoformat(),
            "created_at": _now(),
            "created_by": str(admin_id)
        })

        # Messages (Admin -> Lawyer)
        await db.messages.insert_one({
            "case_id": str(case_id),
            "sender_id": str(admin_id),
            "recipient_id": str(lawyer_uid),
            "content": f"A new case '{case_info['title']}' is created in the law firm and you have been assigned to it. ({case_number})",
            "created_at": _now()
        })

        # Messages (Lawyer -> Client)
        await db.messages.insert_one({
            "case_id": str(case_id),
            "sender_id": str(lawyer_uid),
            "recipient_id": str(client_user_id),
            "content": f"Hello {c_data['name']}, I am {lawyer_name} and I have been assigned to your case \"{case_info['title']}\". Please feel free to reach out to me here for any updates or share the required documents.",
            "created_at": _now()
        })
        
        # Messages (Client -> Lawyer response)
        if i % 3 == 0:
            await db.messages.insert_one({
                "case_id": str(case_id),
                "sender_id": str(client_user_id),
                "recipient_id": str(lawyer_uid),
                "content": f"Thank you {lawyer_name}. I will upload the necessary documents shortly.",
                "created_at": _now()
            })

        # Documents
        doc_name = f"{case_info['title'].replace(' ', '_')}_Agreement.txt"
        doc_content = f"This is a dummy legal document for {case_info['title']}.\nClient: {c_data['company']}\nLawyer: {lawyer_name}\nDate: {_now()}"
        doc_bytes = doc_content.encode('utf-8')
        
        # Save to actual storage using put_object
        storage_info = put_object(doc_name, doc_bytes, "text/plain")
        
        await db.documents.insert_one({
            "case_id": str(case_id),
            "original_filename": doc_name,
            "content_type": "text/plain",
            "storage_path": storage_info["path"],
            "size": storage_info["size"],
            "category": "Contracts",
            "uploaded_by": str(client_user_id),
            "uploaded_by_name": c_data["name"],
            "is_deleted": False,
            "created_at": _now()
        })
        
        # Appointment
        if i % 2 != 0:
            await db.appointments.insert_one({
                "client_id": str(client_id),
                "case_id": str(case_id),
                "lawyer_id": str(lawyer_uid),
                "date": (datetime.now(timezone.utc) + timedelta(days=random.randint(1, 14))).isoformat(),
                "duration": 60,
                "description": f"Strategy Discussion: {case_info['title']}",
                "meeting_type": random.choice(["video", "office", "phone"]),
                "status": "scheduled",
                "created_at": _now(),
                "created_by": str(lawyer_uid)
            })

    print("Database seeded successfully with professional dummy data!")

if __name__ == "__main__":
    asyncio.run(seed())
