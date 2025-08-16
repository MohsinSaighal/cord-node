#!/bin/bash

# Configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="cords"
DB_USER="postgres"
TABLE_NAME="users"
CSV_FILE="users_rows.csv"
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

# Function to get columns that exist in both CSV and table
get_matching_columns() {
    # Get CSV header columns
    CSV_COLUMNS=$(head -1 "$CSV_ABS_PATH" | tr ',' '\n' | tr -d '\r' | tr -d '"')
    
    # Get table columns
    TABLE_COLUMNS=$(PGPASSWORD=${PGPASSWORD} psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = '$TABLE_NAME' 
    AND table_schema = 'public'
    ORDER BY ordinal_position;" | tr -d '[:space:]' | tr '\n' ',')
    
    # Find intersection
    MATCHING_COLUMNS=""
    for col in $(echo "$CSV_COLUMNS" | tr ',' ' '); do
        if [[ ",$TABLE_COLUMNS," == *",$col,"* ]]; then
            MATCHING_COLUMNS="$MATCHING_COLUMNS,$col"
        fi
    done
    
    # Remove leading comma
    MATCHING_COLUMNS=${MATCHING_COLUMNS#","}
    
    echo "$MATCHING_COLUMNS"
}

# Function to import using client-side \copy
import_csv() {
    echo "Starting CSV import process..."
    echo "----------------------------------------"
    
    # Get matching columns
    MATCHING_COLUMNS=$(get_matching_columns)
    
    if [ -z "$MATCHING_COLUMNS" ]; then
        echo "Error: No matching columns found between CSV and table"
        exit 1
    fi
    
    echo "Importing matching columns: $MATCHING_COLUMNS"
    echo "----------------------------------------"
    
    # Use client-side \copy to avoid permission issues
    PGPASSWORD=${PGPASSWORD} psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
    BEGIN;
    
    -- Create temporary table with only matching columns
    CREATE TEMP TABLE temp_import AS 
    SELECT $MATCHING_COLUMNS FROM $TABLE_NAME LIMIT 0;
    
    -- Import using client-side \copy
    \\copy temp_import ($MATCHING_COLUMNS) FROM '$CSV_ABS_PATH' WITH (FORMAT csv, HEADER true, DELIMITER E'$DELIMITER');
    
    -- Show preview of imported data
    SELECT 'Import Preview:' as info;
    SELECT * FROM temp_import LIMIT 3;
    
    -- Check for duplicates first
    SELECT 'Duplicate Check:' as info;
    SELECT 
        COUNT(*) as total_rows,
        COUNT(DISTINCT id) as unique_ids,
        COUNT(*) - COUNT(DISTINCT id) as id_duplicates
    FROM temp_import;
    
    -- Insert data with default values for missing columns
    INSERT INTO $TABLE_NAME 
    SELECT * FROM 
    (SELECT $MATCHING_COLUMNS, 
            false as isnodeactive,  -- Default value for missing column
            NULL as nodeStartTime   -- Default value for missing column
     FROM temp_import) t;
    
    -- Show import statistics
    SELECT 'Import Statistics:' as info;
    SELECT 
        COUNT(*) AS total_rows_processed,
        (SELECT COUNT(*) FROM $TABLE_NAME) AS final_table_count
    FROM temp_import;
    
    COMMIT;
    
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