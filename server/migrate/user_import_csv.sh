#!/bin/bash

# Configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="cords"
DB_USER="postgres"
TABLE_NAME="users"
CSV_FILE="final.csv"
DELIMITER=","

# Get absolute path to CSV file
CSV_ABS_PATH=$(realpath "$CSV_FILE")

# Check if CSV file exists and is readable
if [ ! -f "$CSV_FILE" ]; then
    echo "Error: CSV file $CSV_FILE not found!"
    exit 1
fi

if [ ! -r "$CSV_FILE" ]; then
    echo "Error: No read permission for $CSV_FILE"
    echo "Run: chmod +r $CSV_FILE"
    exit 1
fi

# Function to validate database connection
check_db_connection() {
    if ! PGPASSWORD=${PGPASSWORD} psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" >/dev/null 2>&1; then
        echo "Error: Failed to connect to PostgreSQL database"
        exit 1
    fi
}

# Function to import using client-side \copy
import_csv() {
    echo "Starting CSV import process..."
    echo "----------------------------------------"
    
    # Get table columns in proper order
    TABLE_COLUMNS=$(PGPASSWORD=${PGPASSWORD} psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) 
    FROM information_schema.columns 
    WHERE table_name = '$TABLE_NAME' 
    AND table_schema = 'public';" | tr -d '[:space:]')
    
    if [ -z "$TABLE_COLUMNS" ]; then
        echo "Error: Could not retrieve columns for table $TABLE_NAME"
        exit 1
    fi
    
    echo "Importing columns: $TABLE_COLUMNS"
    echo "----------------------------------------"
    
    # Use client-side \copy to avoid permission issues
    PGPASSWORD=${PGPASSWORD} psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
    BEGIN;
    
    -- Create temporary table
    CREATE TEMP TABLE temp_import (LIKE $TABLE_NAME INCLUDING DEFAULTS);
    
    -- Import using client-side \copy
    \\copy temp_import ($TABLE_COLUMNS) FROM '$CSV_ABS_PATH' WITH (FORMAT csv, HEADER true, DELIMITER E'$DELIMITER');
    
    -- Show preview of imported data
    SELECT 'Import Preview:' as info;
    SELECT id, username, hasbadgeofhonor FROM temp_import LIMIT 3;
    
    -- Check for duplicates first
    SELECT 'Duplicate Check:' as info;
    SELECT 
        COUNT(*) as total_rows,
        COUNT(DISTINCT id) as unique_ids,
        COUNT(DISTINCT username) as unique_usernames,
        COUNT(*) - COUNT(DISTINCT id) as id_duplicates,
        COUNT(*) - COUNT(DISTINCT username) as username_duplicates
    FROM temp_import;
    
    -- Insert data keeping only one record per unique username (most recent)
    INSERT INTO $TABLE_NAME ($TABLE_COLUMNS)
    SELECT DISTINCT ON (username) $TABLE_COLUMNS FROM temp_import
    ORDER BY username, updated_at DESC NULLS LAST;
    
    -- Show import statistics
    SELECT 'Import Statistics:' as info;
    SELECT 
        COUNT(*) AS total_rows_processed,
        (SELECT COUNT(*) FROM $TABLE_NAME) AS final_table_count
    FROM temp_import;
    
    COMMIT;  -- ACTUALLY COMMIT THE DATA!
    
    SELECT 'Import completed successfully!' as status;
EOF
}

# Main execution
echo "Starting CSV import to PostgreSQL..."
echo "Database: $DB_NAME, Table: $TABLE_NAME"
echo "Original CSV File: $CSV_ABS_PATH"
echo "----------------------------------------"

# Prompt for password if not set
if [ -z "$PGPASSWORD" ]; then
    read -sp "Enter PostgreSQL password for $DB_USER: " PGPASSWORD
    export PGPASSWORD
    echo -e "\n"
fi

# Check database connection
check_db_connection

# Run the import
import_csv

# Clean up
unset PGPASSWORD

echo "----------------------------------------"
echo "CSV import completed successfully."
exit 0