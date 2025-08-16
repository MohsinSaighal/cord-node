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

# Function to create a cleaned CSV with proper column mapping
create_cleaned_csv() {
    local temp_csv="/tmp/cleaned_users.csv"
    echo "Creating cleaned CSV with proper column mapping..."
    
    # Create header that matches the database table exactly
    echo "id,username,discriminator,avatar,account_age,join_date,multiplier,total_earned,current_balance,is_node_active,node_start_time,tasks_completed,rank,last_login_time,daily_checkin_claimed,weekly_earnings,monthly_earnings,referral_code,referred_by,referral_earnings,total_referrals,created_at,updated_at,current_epoch_id,epoch_join_date,total_epoch_earnings,lifetime_referral_earnings,last_referral_payout,compensation_claimed,hasbadgeofhonor" > "$temp_csv"
    
    # Process data rows: skip compensationclaimed column (column 30) and use hasbadgeofhonor as hasbadgeofhonor
    tail -n +2 "$CSV_FILE" | awk -F',' '{
        # Print columns 1-29 (all columns before compensationclaimed)
        for(i=1; i<=29; i++) {
            printf "%s", $i
            if(i < 29) printf ","
        }
        # Skip column 30 (compensationclaimed)
        # Add column 31 (hasbadgeofhonor) as the last column
        printf ",%s\n", $31
    }' >> "$temp_csv"
    
    echo "Cleaned CSV created at: $temp_csv"
    echo "First few lines of cleaned CSV:"
    head -3 "$temp_csv"
    echo "----------------------------------------"
    
    # Return the path to the cleaned CSV
    echo "$temp_csv"
}

# Function to import using client-side \copy
import_csv() {
    local csv_file="$1"
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
    \\copy temp_import ($TABLE_COLUMNS) FROM '$csv_file' WITH (FORMAT csv, HEADER true, DELIMITER E'$DELIMITER');
    
    -- Show preview of imported data
    SELECT 'Import Preview:' as info;
    SELECT id, username, hasbadgeofhonor FROM temp_import LIMIT 3;
    
    -- Insert with conflict handling (upsert)
    INSERT INTO $TABLE_NAME ($TABLE_COLUMNS)
    SELECT $TABLE_COLUMNS FROM temp_import
    ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        discriminator = EXCLUDED.discriminator,
        avatar = EXCLUDED.avatar,
        account_age = EXCLUDED.account_age,
        join_date = EXCLUDED.join_date,
        multiplier = EXCLUDED.multiplier,
        total_earned = EXCLUDED.total_earned,
        current_balance = EXCLUDED.current_balance,
        is_node_active = EXCLUDED.is_node_active,
        node_start_time = EXCLUDED.node_start_time,
        tasks_completed = EXCLUDED.tasks_completed,
        rank = EXCLUDED.rank,
        last_login_time = EXCLUDED.last_login_time,
        daily_checkin_claimed = EXCLUDED.daily_checkin_claimed,
        weekly_earnings = EXCLUDED.weekly_earnings,
        monthly_earnings = EXCLUDED.monthly_earnings,
        referral_code = EXCLUDED.referral_code,
        referred_by = EXCLUDED.referred_by,
        referral_earnings = EXCLUDED.referral_earnings,
        total_referrals = EXCLUDED.total_referrals,
        created_at = EXCLUDED.created_at,
        updated_at = EXCLUDED.updated_at,
        current_epoch_id = EXCLUDED.current_epoch_id,
        epoch_join_date = EXCLUDED.epoch_join_date,
        total_epoch_earnings = EXCLUDED.total_epoch_earnings,
        lifetime_referral_earnings = EXCLUDED.lifetime_referral_earnings,
        last_referral_payout = EXCLUDED.last_referral_payout,
        compensation_claimed = EXCLUDED.compensation_claimed,
        hasbadgeofhonor = EXCLUDED.hasbadgeofhonor;
    
    -- Show import statistics
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

# Create cleaned CSV with proper column mapping
CLEANED_CSV=$(create_cleaned_csv)

# Run the import
import_csv "$CLEANED_CSV"

# Clean up temporary file
rm -f "$CLEANED_CSV"
unset PGPASSWORD

echo "----------------------------------------"
echo "CSV import completed successfully."
exit 0