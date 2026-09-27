"""Common logging utilities for all services."""

import json
import logging
import sys
import uuid
from datetime import datetime


class JSONFormatter(logging.Formatter):
    """JSON log formatter."""

    def format(self, record):
        log_data = {
            "ts": datetime.utcnow().isoformat() + "Z",
            "service": getattr(record, "service", "unknown"),
            "level": record.levelname,
            "request_id": getattr(record, "request_id", None),
            "message": record.getMessage(),
        }

        if hasattr(record, "event"):
            log_data["event"] = record.event

        if hasattr(record, "payload"):
            log_data["payload"] = record.payload

        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data, ensure_ascii=False)


def setup_logging(service_name: str, level: str = "INFO"):
    """Setup JSON logging for a service."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())

    logger = logging.getLogger()
    logger.setLevel(getattr(logging, level.upper()))
    logger.handlers = []
    logger.addHandler(handler)

    # Add service name to all records
    old_factory = logging.getLogRecordFactory()

    def record_factory(*args, **kwargs):
        record = old_factory(*args, **kwargs)
        record.service = service_name
        return record

    logging.setLogRecordFactory(record_factory)

    return logger


def get_logger(name: str):
    """Get logger with request ID support."""
    return logging.getLogger(name)
