"""
Scheduler Service for automatic exam activation/deactivation.
Uses APScheduler to run background tasks.
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime
import pytz
from typing import Optional

# Import Firebase config
from firebase_config import db


class ExamSchedulerService:
    """Service to manage scheduled exam activation and deactivation."""
    
    def __init__(self):
        self.scheduler: Optional[BackgroundScheduler] = None
        self.timezone = pytz.timezone('Asia/Kolkata')  # IST
    
    def start(self):
        """Start the background scheduler."""
        if self.scheduler is not None:
            return
        
        self.scheduler = BackgroundScheduler(timezone=self.timezone)
        
        # Check exam schedules every minute
        self.scheduler.add_job(
            self.check_exam_schedules,
            trigger=IntervalTrigger(minutes=1),
            id='check_exam_schedules',
            name='Check and update exam schedules',
            replace_existing=True
        )
        
        self.scheduler.start()
        print("✓ Exam scheduler started - checking every minute")
    
    def stop(self):
        """Stop the background scheduler."""
        if self.scheduler:
            self.scheduler.shutdown()
            self.scheduler = None
            print("✓ Exam scheduler stopped")
    
    def check_exam_schedules(self):
        """Check all exams and update their status based on schedule."""
        if not db:
            return
        
        now = datetime.now(self.timezone)
        now_iso = now.isoformat()
        
        try:
            # Get all scheduled and active exams
            exams_ref = db.collection('exams')
            
            # Check scheduled exams that should be activated
            scheduled_exams = exams_ref.where('status', '==', 'scheduled').stream()
            
            for exam_doc in scheduled_exams:
                exam = exam_doc.to_dict()
                scheduled_at = exam.get('scheduledAt')
                
                if scheduled_at:
                    try:
                        # Parse the scheduled time
                        scheduled_time = datetime.fromisoformat(scheduled_at.replace('Z', '+00:00'))
                        
                        # If scheduled time has passed, activate the exam
                        if now >= scheduled_time:
                            exams_ref.document(exam_doc.id).update({
                                'status': 'active',
                                'startTime': now_iso
                            })
                            print(f"✓ Activated exam: {exam.get('title', exam_doc.id)}")
                    except Exception as e:
                        print(f"⚠ Error parsing schedule for exam {exam_doc.id}: {e}")
            
            # Check active exams that should be deactivated
            active_exams = exams_ref.where('status', '==', 'active').stream()
            
            for exam_doc in active_exams:
                exam = exam_doc.to_dict()
                end_time = exam.get('endTime')
                
                # If endTime is set and has passed, deactivate
                if end_time:
                    try:
                        end_datetime = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                        
                        if now >= end_datetime:
                            exams_ref.document(exam_doc.id).update({
                                'status': 'completed'
                            })
                            print(f"✓ Completed exam: {exam.get('title', exam_doc.id)}")
                    except Exception as e:
                        print(f"⚠ Error parsing end time for exam {exam_doc.id}: {e}")
                else:
                    # Check if exam should auto-end based on start time + duration
                    start_time = exam.get('startTime')
                    duration = exam.get('duration', 0)  # Duration in minutes
                    
                    if start_time and duration > 0:
                        try:
                            start_datetime = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                            from datetime import timedelta
                            auto_end_time = start_datetime + timedelta(minutes=duration + 30)  # +30 min buffer
                            
                            if now >= auto_end_time:
                                exams_ref.document(exam_doc.id).update({
                                    'status': 'completed',
                                    'endTime': now_iso
                                })
                                print(f"✓ Auto-completed exam (duration exceeded): {exam.get('title', exam_doc.id)}")
                        except Exception as e:
                            print(f"⚠ Error calculating auto-end for exam {exam_doc.id}: {e}")
                            
        except Exception as e:
            print(f"⚠ Error in exam scheduler: {e}")
    
    def run_now(self):
        """Manually trigger a schedule check (for testing)."""
        print("🔄 Running manual exam schedule check...")
        self.check_exam_schedules()
        return {"message": "Schedule check completed", "timestamp": datetime.now(self.timezone).isoformat()}


# Singleton instance
exam_scheduler = ExamSchedulerService()
