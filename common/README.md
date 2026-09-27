# Common module

Shared utilities for all services.

## Quick start

```python
from common.logging import setup_logging, get_logger

# Setup JSON logging
setup_logging("backend", "INFO")

# Get logger
logger = get_logger(__name__)
logger.info("Service started")
```

## Features

- JSON logging to stdout
- X-Request-ID propagation
- Prometheus metrics buckets
