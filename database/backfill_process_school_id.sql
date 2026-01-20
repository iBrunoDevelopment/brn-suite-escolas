
-- Backfill school_id in accountability_processes from financial_entries
UPDATE accountability_processes 
SET school_id = financial_entries.school_id 
FROM financial_entries 
WHERE accountability_processes.financial_entry_id = financial_entries.id 
AND accountability_processes.school_id IS NULL;
