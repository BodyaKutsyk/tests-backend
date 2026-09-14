CREATE INDEX idx_tests_search_vector ON tests USING gin(search_vector);
CREATE INDEX idx_document_mime_created ON documents (mime_type, created_at);
CREATE INDEX idx_document_user_id ON documents (user_id);
CREATE INDEX idx_created_at_user ON users (created_at);
CREATE INDEX idx_document_file_name_length ON documents (length(file_name))
