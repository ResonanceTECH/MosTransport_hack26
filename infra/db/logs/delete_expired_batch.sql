-- One bounded transaction; the maintenance role can only execute this function.
SELECT public.delete_expired_logs_batch();
