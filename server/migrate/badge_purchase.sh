#!/bin/bash

# =============================================================================
# GENERIC CSV IMPORT SCRIPT FOR POSTGRESQL
# =============================================================================
# This script can be easily customized for any table by modifying the 
# configuration section below.

# =============================================================================
# CONFIGURATION - MODIFY THIS SECTION FOR YOUR SPECIFIC TABLE
# =============================================================================

DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="cords"
DB_USER="postgres"
TABLE_NAME="badge_purchases"  # CHANGE THIS
CSV_FILE="badge.csv"      # CHANGE THIS
DELIMITER=","

# Define your table schema here - MODIFY THIS
# Format: "column_name:data_type:constraints"
SCHEMA=(
    "id:UUID:PRIMARY KEY DEFAULT gen_random_uuid()"
    "user_id:TEXT:NOT NULL"
    "wallet_address:VARCHAR(64):NOT NULL"
    "transaction_hash:VARCHAR(120):UNIQUE NOT NULL"
    "amount_sol:DECIMAL(10,6):NOT NULL"
    "amount_usd:DECIMAL(10,2):NOT NULL"
    "purchase_date:TIMESTAMP WITH TIME ZONE:DEFAULT NOW()"
    "status:VARCHAR(20):DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed'))"
    # Add more columns as needed
)

# Define columns to import (should match your CSV header)
IMPORT_COLUMNS="id,user_id,wallet_address,transaction_hash,amount_sol,amount_usd,purchase_date,status"  # CHANGE THIS

# Define unique constraint column for conflict resolution
UNIQUE_COLUMN="id"  # CHANGE THIS (e.g., "transaction_hash", "email", etc.)

# Define update columns for ON CONFLICT DO UPDATE (exclude the unique column)
UPDATE_COLUMNS="user_id"  # CHANGE THIS

# =============================================================================
# SCRIPT LOGIC - NO NEED TO MODIFY BELOW THIS LINE
# =============================================================================

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

# Function to inspect CSV structure
inspect_csv() {
    echo "Inspecting CSV structure..."
    echo "First few lines of CSV:"
    head -3 "$CSV_FILE"
    echo ""
    echo "Number of columns in header:"
    head -1 "$CSV_FILE" | tr "$DELIMITER" '\n' | wc -l
    echo ""
    echo "CSV Header columns:"
    head -1 "$CSV_FILE" | tr "$DELIMITER" '\n' | nl
    echo "----------------------------------------"
}

# Function to create table if it doesn't exist
create_table_if_not_exists() {
    echo "Creating table if it doesn't exist..."
    
    # Build CREATE TABLE statement from schema array
    local create_sql="CREATE TABLE IF NOT EXISTS $TABLE_NAME ("
    for i in "${!SCHEMA[@]}"; do
        local column_def="${SCHEMA[$i]}"
        local column_name=$(echo "$column_def" | cut -d':' -f1)
        local data_type=$(echo "$column_def" | cut -d':' -f2)
        local constraints=$(echo "$column_def" | cut -d':' -f3-)
        
        if [ $i -gt 0 ]; then
            create_sql+=", "
        fi
        create_sql+="$column_name $data_type"
        
        if [ "$constraints" != "$data_type" ]; then
            create_sql+=" $constraints"
        fi
    done
    create_sql+=");"
    
    PGPASSWORD=${PGPASSWORD} psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
    $create_sql
    
    -- Create useful indexes
    CREATE INDEX IF NOT EXISTS idx_badge_purchases_user_id ON $TABLE_NAME(user_id);
    CREATE INDEX IF NOT EXISTS idx_badge_purchases_status ON $TABLE_NAME(status);
    CREATE INDEX IF NOT EXISTS idx_badge_purchases_purchase_date ON $TABLE_NAME(purchase_date);
    CREATE INDEX IF NOT EXISTS idx_badge_purchases_wallet_address ON $TABLE_NAME(wallet_address);
    
    SELECT 'Table $TABLE_NAME is ready!' as status;
EOF
}

# Function to build conflict resolution SQL
build_conflict_sql() {
    local update_set=""
    IFS=',' read -ra COLS <<< "$UPDATE_COLUMNS"
    for i in "${!COLS[@]}"; do
        local col="${COLS[$i]// /}"  # Remove spaces
        if [ $i -gt 0 ]; then
            update_set+=", "
        fi
        update_set+="$col = EXCLUDED.$col"
    done
    echo "$update_set"
}

# Function to import CSV
import_csv() {
    echo "Starting CSV import process..."
    echo "----------------------------------------"
    
    local conflict_update=$(build_conflict_sql)
    
    echo "Importing into table: $TABLE_NAME"
    echo "Columns: $IMPORT_COLUMNS"
    echo "Unique column: $UNIQUE_COLUMN"
    echo "Using delimiter: '$DELIMITER'"
    echo "----------------------------------------"
    
    PGPASSWORD=${PGPASSWORD} psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
    BEGIN;
    
    -- Create temporary table
    CREATE TEMP TABLE temp_import (LIKE $TABLE_NAME INCLUDING DEFAULTS);
    
    -- Import using client-side \copy
    \\copy temp_import ($IMPORT_COLUMNS) FROM '$CSV_ABS_PATH' WITH (FORMAT csv, HEADER true, DELIMITER E'$DELIMITER');
    
    -- Show preview of imported data
    SELECT 'Import Preview:' as info;
    SELECT id, user_id, wallet_address, transaction_hash, amount_sol, amount_usd, status FROM temp_import LIMIT 3;
    
    -- Data validation
    SELECT 'Data Validation:' as info;
    SELECT 
        COUNT(*) as total_rows,
        COUNT(CASE WHEN user_id IS NULL OR user_id = '' THEN 1 END) as missing_user_id,
        COUNT(CASE WHEN wallet_address IS NULL OR wallet_address = '' THEN 1 END) as missing_wallet,
        COUNT(CASE WHEN transaction_hash IS NULL OR transaction_hash = '' THEN 1 END) as missing_tx_hash,
        COUNT(CASE WHEN status NOT IN ('pending', 'completed', 'failed') THEN 1 END) as invalid_status,
        COUNT(CASE WHEN amount_sol <= 0 THEN 1 END) as invalid_sol_amount,
        COUNT(CASE WHEN amount_usd <= 0 THEN 1 END) as invalid_usd_amount
    FROM temp_import;
    
    -- Insert with conflict handling
    INSERT INTO $TABLE_NAME ($IMPORT_COLUMNS)
    SELECT $IMPORT_COLUMNS FROM temp_import
    ON CONFLICT ($UNIQUE_COLUMN) DO UPDATE SET
        $conflict_update;
    
    -- Show import statistics
    SELECT 'Import Statistics:' as info;
    SELECT 
        (SELECT COUNT(*) FROM temp_import) AS rows_processed,
        (SELECT COUNT(*) FROM $TABLE_NAME) AS final_table_count;
        
    -- Show status distribution
    SELECT 'Status Distribution:' as info;
    SELECT status, COUNT(*) as count
    FROM $TABLE_NAME 
    GROUP BY status
    ORDER BY status;
    
    COMMIT;
    
    SELECT 'Import completed successfully!' as status;
EOF
}

# Main execution
echo "Starting CSV import to PostgreSQL..."
echo "Database: $DB_NAME, Table: $TABLE_NAME"
echo "CSV File: $CSV_ABS_PATH"
echo "----------------------------------------"

# Validate configuration
if [ "$TABLE_NAME" = "your_table_name" ] || [ "$CSV_FILE" = "your_file.csv" ]; then
    echo "Error: Please configure the script by editing the CONFIGURATION section!"
    echo "You need to set TABLE_NAME, CSV_FILE, SCHEMA, and other parameters."
    exit 1
fi

# Prompt for password if not set
if [ -z "$PGPASSWORD" ]; then
    read -sp "Enter PostgreSQL password for $DB_USER: " PGPASSWORD
    export PGPASSWORD
    echo -e "\n"
fi

# Check database connection
check_db_connection

# Create table if it doesn't exist
create_table_if_not_exists

# Inspect CSV structure
inspect_csv

# Ask for confirmation before importing
echo ""
read -p "Do you want to proceed with the import? (y/N): " confirm
if [[ $confirm =~ ^[Yy]$ ]]; then
    # Run the import
    import_csv
else
    echo "Import cancelled by user."
fi

# Clean up
unset PGPASSWORD
echo "----------------------------------------"
echo "Script execution completed."
exit 0