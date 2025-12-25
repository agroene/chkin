-- Create DocuSeal database if it doesn't exist
SELECT 'CREATE DATABASE docuseal'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'docuseal')\gexec
