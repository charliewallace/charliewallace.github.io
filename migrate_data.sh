#!/bin/bash

# migrate_data.sh
# Script to migrate data from pCloud to Google Drive using Rclone.
# Handles Google's 750GB/day upload limit by pausing and resuming.

LOG_FILE="migration.log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# 1. Install Rclone if not present
if ! command -v rclone &> /dev/null; then
    log "Rclone not found. Installing..."
    # Using the official install script. May require sudo.
    if command -v curl &> /dev/null; then
        curl https://rclone.org/install.sh | sudo bash
    elif command -v wget &> /dev/null; then
        wget -qO- https://rclone.org/install.sh | sudo bash
    else
        log "Neither curl nor wget found. Please install rclone manually."
        exit 1
    fi

    if [ $? -eq 0 ]; then
        log "Rclone installed successfully."
    else
        log "Failed to install Rclone."
        exit 1
    fi
else
    log "Rclone is already installed: $(rclone --version | head -n 1)"
fi

# 2. Configuration Setup
# Creates a template configuration file if it doesn't exist.
RCLONE_CONFIG_PATH="$HOME/.config/rclone/rclone.conf"
if [ ! -f "$RCLONE_CONFIG_PATH" ]; then
    log "Creating rclone config template at $RCLONE_CONFIG_PATH..."
    mkdir -p "$(dirname "$RCLONE_CONFIG_PATH")"
    cat <<EOF > "$RCLONE_CONFIG_PATH"
[pcloud]
type = pcloud
hostname = api.pcloud.com
username = YOUR_PCLOUD_EMAIL
password = YOUR_PCLOUD_PASSWORD

[gdrive]
type = drive
scope = drive
token = YOUR_GDRIVE_TOKEN
# Leave 'token' blank or use the authorization steps provided to fill it.
EOF
    log "Config template created. Please edit it with your credentials before proceeding."
    log "To authorize Google Drive on a headless VM, follow the instructions provided separately."
else
    log "Rclone configuration already exists at $RCLONE_CONFIG_PATH."
fi

SOURCE="pcloud:"
DEST="gdrive:Backup"

log "Starting migration loop..."

# 3. Transfer Loop
# This loop handles the 750GB/day limit by catching the error and waiting.
while true; do
    log "Executing: rclone copy $SOURCE $DEST ..."

    # High-performance flags:
    # --drive-chunk-size 128M: Significantly speeds up large file uploads (uses more RAM).
    # --transfers 8: Concurrent file transfers.
    # --buffer-size 64M: Extra memory buffer for each transfer.
    # --drive-stop-on-upload-limit: Specifically exits when the 750GB limit is hit.
    # --verbose: Detailed logging.
    # --progress: Shows progress in stdout (captured by tee if needed, but we use --log-file).

    rclone copy "$SOURCE" "$DEST" \
        --drive-chunk-size 128M \
        --transfers 8 \
        --buffer-size 64M \
        --drive-stop-on-upload-limit \
        --verbose \
        --log-file="$LOG_FILE"

    EXIT_CODE=$?

    if [ $EXIT_CODE -eq 0 ]; then
        log "Migration completed successfully!"
        exit 0
    elif [ $EXIT_CODE -eq 1 ] || [ $EXIT_CODE -eq 7 ]; then
        # Often Rclone returns 1 or 7 when hitting limits or fatal errors.
        log "Rclone exited with code $EXIT_CODE. Likely hit the daily upload limit or a network error."
        log "Waiting 24 hours to reset quota..."
        sleep 24h
    else
        log "Rclone exited with an unexpected code: $EXIT_CODE."
        log "Retrying in 1 hour..."
        sleep 1h
    fi
done
