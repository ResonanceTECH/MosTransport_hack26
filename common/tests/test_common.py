from __future__ import annotations

import io
import json
import threading
import unittest
from uuid import UUID

from mos_transport_common import AsyncBatchWriter, LogEmitter, get_request_id, request_context, resolve_request_id


class RequestIdTests(unittest.TestCase):
    def test_valid_uuid_is_preserved_and_invalid_header_replaced(self) -> None:
        request_id = "3c1a6d45-4aab-4cc1-9f5e-3d7f3fbf64b0"
        self.assertEqual(resolve_request_id(request_id), request_id)
        UUID(resolve_request_id("not-a-uuid"))
        UUID(resolve_request_id(None))

    def test_context_is_nested_and_restored(self) -> None:
        outer = "3c1a6d45-4aab-4cc1-9f5e-3d7f3fbf64b0"
        inner = "f584f16f-7634-4117-8ca9-554fcb742f6d"
        with request_context(outer):
            self.assertEqual(get_request_id(), outer)
            with request_context(inner):
                self.assertEqual(get_request_id(), inner)
            self.assertEqual(get_request_id(), outer)


class EmitterTests(unittest.TestCase):
    def test_emits_exact_contract_and_strips_query_string(self) -> None:
        output = io.StringIO()
        submitted: list[dict] = []

        class Writer:
            def submit(self, record: dict) -> bool:
                submitted.append(record)
                return True

        emitter = LogEmitter("backend", writer=Writer(), stdout=output)
        record = emitter.emit(
            "info", "http.request", "request completed",
            request_id="3c1a6d45-4aab-4cc1-9f5e-3d7f3fbf64b0",
            method="get", path="/api/items?access_token=do-not-log", status=200,
            latency_ms=12.5, payload={"count": 2},
        )
        self.assertEqual(
            set(record),
            {"ts", "service", "level", "request_id", "user_id", "event", "message",
             "method", "path", "status", "latency_ms", "payload"},
        )
        self.assertEqual(record["path"], "/api/items")
        self.assertEqual(record["method"], "GET")
        self.assertEqual(json.loads(output.getvalue()), record)
        self.assertEqual(submitted, [record])
        self.assertNotIn("do-not-log", output.getvalue())

    def test_rejects_unknown_service_and_invalid_status(self) -> None:
        with self.assertRaises(ValueError):
            LogEmitter("unknown")
        with self.assertRaises(ValueError):
            LogEmitter("backend", stdout=io.StringIO()).emit("INFO", "x", "y", status=99)


class AsyncWriterTests(unittest.TestCase):
    def test_batches_records_off_caller_thread_and_drains_on_close(self) -> None:
        batches: list[list[dict]] = []
        delivered = threading.Event()

        def sink(batch: list[dict]) -> None:
            batches.append(batch)
            delivered.set()

        writer = AsyncBatchWriter(sink, batch_size=2, flush_interval=0.05)
        self.assertTrue(writer.submit({"n": 1}))
        self.assertTrue(writer.submit({"n": 2}))
        self.assertTrue(delivered.wait(1))
        self.assertTrue(writer.close())
        self.assertEqual(batches, [[{"n": 1}, {"n": 2}]])

    def test_full_queue_drops_db_copy_without_blocking_and_close_can_retry(self) -> None:
        sink_started = threading.Event()
        release_sink = threading.Event()

        def slow_sink(_batch: list[dict]) -> None:
            sink_started.set()
            release_sink.wait(1)

        writer = AsyncBatchWriter(slow_sink, batch_size=1, queue_size=1, flush_interval=0.05)
        self.assertTrue(writer.submit({"n": 1}))
        self.assertTrue(sink_started.wait(1))
        self.assertTrue(writer.submit({"n": 2}))
        self.assertFalse(writer.submit({"n": 3}))
        self.assertFalse(writer.close(timeout=0))
        release_sink.set()
        self.assertTrue(writer.close(timeout=1))

    def test_sink_failure_is_contained(self) -> None:
        errors: list[Exception] = []

        def fail(_batch: list[dict]) -> None:
            raise ConnectionError("private connection detail")

        writer = AsyncBatchWriter(fail, retries=0, on_error=errors.append)
        self.assertTrue(writer.submit({"n": 1}))
        self.assertTrue(writer.close())
        self.assertEqual(len(errors), 1)
        self.assertIsInstance(errors[0], ConnectionError)


if __name__ == "__main__":
    unittest.main()
