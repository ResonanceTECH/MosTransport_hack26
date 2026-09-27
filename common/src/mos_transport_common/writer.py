"""Bounded asynchronous batch delivery; application logging never waits on DB I/O."""

from __future__ import annotations

import queue
import sys
import threading
import time
from collections.abc import Callable, Mapping
from typing import Any

Record = Mapping[str, Any]
BatchSink = Callable[[list[Record]], None]
_STOP = object()


class AsyncBatchWriter:
    """Deliver records on a daemon thread with bounded queue and batches.

    LogEmitter writes each record to stdout before submitting it here. Queue
    overflow or sink failure therefore leaves the stdout copy intact.
    """

    def __init__(
        self,
        sink: BatchSink,
        *,
        batch_size: int = 100,
        flush_interval: float = 0.5,
        queue_size: int = 5000,
        retries: int = 2,
        on_error: Callable[[Exception], None] | None = None,
    ) -> None:
        if batch_size < 1 or queue_size < 1 or flush_interval <= 0 or retries < 0:
            raise ValueError("batch_size/queue_size/retries/flush_interval are invalid")
        self._sink = sink
        self._batch_size = batch_size
        self._flush_interval = flush_interval
        self._retries = retries
        self._on_error = on_error or self._default_error_handler
        self._queue: queue.Queue[object] = queue.Queue(maxsize=queue_size)
        self._close_lock = threading.Lock()
        self._closed = False
        self._stop_enqueued = False
        self._thread = threading.Thread(target=self._run, name="logs-db-writer", daemon=True)
        self._thread.start()

    def submit(self, record: Record) -> bool:
        """Enqueue without blocking; False means stdout-only fallback."""
        if self._closed:
            return False
        try:
            self._queue.put_nowait(dict(record))
            return True
        except queue.Full:
            return False

    def close(self, timeout: float = 5.0) -> bool:
        """Drain queued records and stop; return False if timeout expires."""
        if timeout < 0:
            raise ValueError("timeout must be non-negative")
        with self._close_lock:
            if not self._closed:
                self._closed = True
            if not self._stop_enqueued:
                try:
                    self._queue.put(_STOP, timeout=timeout)
                except queue.Full:
                    return False
                self._stop_enqueued = True
        self._thread.join(timeout=timeout)
        return not self._thread.is_alive()

    def _run(self) -> None:
        stopping = False
        while not stopping:
            item = self._queue.get()
            if item is _STOP:
                self._queue.task_done()
                return
            batch = [item]
            deadline = time.monotonic() + self._flush_interval
            while len(batch) < self._batch_size:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    break
                try:
                    item = self._queue.get(timeout=remaining)
                except queue.Empty:
                    break
                if item is _STOP:
                    self._queue.task_done()
                    stopping = True
                    break
                batch.append(item)
            try:
                self._deliver(batch)  # type: ignore[arg-type]
            finally:
                for _ in batch:
                    self._queue.task_done()

    def _deliver(self, batch: list[Record]) -> None:
        for attempt in range(self._retries + 1):
            try:
                self._sink(batch)
                return
            except Exception as exc:  # DB failures must not escape into app requests.
                if attempt < self._retries:
                    time.sleep(0.1 * (2**attempt))
                else:
                    try:
                        self._on_error(exc)
                    except Exception:
                        # Observability failure handlers must not kill the worker.
                        pass

    @staticmethod
    def _default_error_handler(exc: Exception) -> None:
        # Do not print exception text: drivers may include connection details.
        sys.stderr.write(
            '{"event":"logs_db_write_failed","error_type":"'
            + type(exc).__name__
            + '"}\n'
        )
        sys.stderr.flush()
