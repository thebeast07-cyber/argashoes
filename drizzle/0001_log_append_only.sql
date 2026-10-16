-- PRD: log perubahan status dan audit log tidak bisa diedit atau dihapus.
CREATE FUNCTION tolak_ubah_log() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Tabel % hanya bisa ditambah, tidak bisa diubah atau dihapus', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER order_events_append_only
  BEFORE UPDATE OR DELETE ON order_events
  FOR EACH ROW EXECUTE FUNCTION tolak_ubah_log();
--> statement-breakpoint
CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION tolak_ubah_log();
