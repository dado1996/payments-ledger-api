-- Custom SQL migration file, put your code below! --
CREATE OR REPLACE FUNCTION prevent_update_or_delete() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Update and delete operations are not allowed on the entries table.';
END;
$$ LANGUAGE plpgsql;

--> statement-breakpoint

CREATE TRIGGER append_only_entries
    BEFORE UPDATE OR DELETE ON entries
    FOR EACH ROW EXECUTE FUNCTION prevent_update_or_delete();