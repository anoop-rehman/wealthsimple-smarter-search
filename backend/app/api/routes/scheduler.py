"""Scheduler control API routes."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
from app.services.scheduler_service import (
    get_scheduler_status,
    trigger_update_now,
    start_scheduler,
    stop_scheduler
)

router = APIRouter(tags=["scheduler"])


class SchedulerStatus(BaseModel):
    running: bool
    jobs: List[dict]
    last_update: dict


class TriggerResponse(BaseModel):
    success: bool
    message: str


@router.get("/scheduler/status", response_model=SchedulerStatus)
def scheduler_status():
    """Get the current scheduler status and last update info."""
    return get_scheduler_status()


@router.post("/scheduler/trigger", response_model=TriggerResponse)
def trigger_update():
    """Manually trigger an immediate stock update."""
    return trigger_update_now()


@router.post("/scheduler/start", response_model=TriggerResponse)
def start(interval_minutes: int = 15):
    """Start the scheduler with specified interval (default 15 min)."""
    try:
        start_scheduler(interval_minutes)
        return TriggerResponse(
            success=True,
            message=f"Scheduler started with {interval_minutes} minute interval"
        )
    except Exception as e:
        return TriggerResponse(success=False, message=str(e))


@router.post("/scheduler/stop", response_model=TriggerResponse)
def stop():
    """Stop the scheduler."""
    try:
        stop_scheduler()
        return TriggerResponse(success=True, message="Scheduler stopped")
    except Exception as e:
        return TriggerResponse(success=False, message=str(e))
