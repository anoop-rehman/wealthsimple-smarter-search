"""Scheduler service for automatic stock updates."""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import pytz
from app.database import SessionLocal
from app.services.stock_update_service import update_all_stocks

# Scheduler instance
scheduler = BackgroundScheduler()

# Track last update info
last_update_info = {
    "last_run": None,
    "stocks_updated": 0,
    "stocks_failed": 0,
    "status": "idle"
}


def scheduled_stock_update():
    """Job function to update all stocks."""
    global last_update_info

    last_update_info["status"] = "running"
    print(f"[Scheduler] Starting stock update at {datetime.now()}")

    db = SessionLocal()
    try:
        result = update_all_stocks(db)
        last_update_info["last_run"] = datetime.now().isoformat()
        last_update_info["stocks_updated"] = result["success"]
        last_update_info["stocks_failed"] = result["failed"]
        last_update_info["status"] = "completed"
        print(f"[Scheduler] Completed: {result['success']} updated, {result['failed']} failed")
    except Exception as e:
        last_update_info["status"] = f"error: {str(e)}"
        print(f"[Scheduler] Error: {e}")
    finally:
        db.close()


def start_scheduler(interval_minutes: int = 15):
    """
    Start the scheduler with stock updates.

    Args:
        interval_minutes: How often to update stocks (default 15 min)
    """
    if scheduler.running:
        print("[Scheduler] Already running")
        return

    # Add job to run every X minutes during market hours (9:30 AM - 4:00 PM ET, Mon-Fri)
    # Using ET timezone for US/Canadian markets
    eastern = pytz.timezone('America/New_York')

    scheduler.add_job(
        scheduled_stock_update,
        CronTrigger(
            day_of_week='mon-fri',
            hour='9-16',  # 9 AM to 4 PM
            minute=f'*/{interval_minutes}',
            timezone=eastern
        ),
        id='stock_update_job',
        name='Stock Price Update',
        replace_existing=True
    )

    scheduler.start()
    print(f"[Scheduler] Started - updating every {interval_minutes} minutes during market hours (ET)")


def stop_scheduler():
    """Stop the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        print("[Scheduler] Stopped")


def get_scheduler_status():
    """Get current scheduler status."""
    jobs = []
    if scheduler.running:
        for job in scheduler.get_jobs():
            jobs.append({
                "id": job.id,
                "name": job.name,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None
            })

    return {
        "running": scheduler.running,
        "jobs": jobs,
        "last_update": last_update_info
    }


def trigger_update_now():
    """Manually trigger an immediate stock update."""
    if last_update_info["status"] == "running":
        return {"success": False, "message": "Update already in progress"}

    # Run in background thread
    from threading import Thread
    thread = Thread(target=scheduled_stock_update)
    thread.start()

    return {"success": True, "message": "Update triggered"}
