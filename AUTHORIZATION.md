# Headless Google Drive Authorization for Rclone

Since your Google Cloud VM is headless (no browser), you cannot authorize Google Drive directly on it. Follow these steps instead:

## Alternative: Using rcloneView
If you have **rcloneView** installed on your local PC, you can use its graphical interface to add the Google Drive remote. Once configured locally, you can find the generated token in your local `rclone.conf` file (usually in `%AppData%/rclone/rclone.conf` on Windows or `~/.config/rclone/rclone.conf` on Mac/Linux) and copy it to the VM.

## 1. Install Rclone on your local machine (PC/Mac)
If you don't use rcloneView, you only need the Rclone CLI locally to generate the authorization token.
Download it from [rclone.org](https://rclone.org/downloads/).

## 2. Generate the Token via CLI
Open a terminal on your **local machine** and run:
```bash
rclone authorize "drive"
```
This will open your web browser. Log in to your Google Account and grant the permissions requested.

## 3. Copy the Token
After you authorize in the browser, your terminal will display a JSON-formatted token. It looks like this:
```json
{"access_token":"xxx","token_type":"Bearer","refresh_token":"xxx","expiry":"202x-xx-xxTxx:xx:xx.xxxxxxx"}
```

## 4. Update the VM Configuration
Go back to your Google Cloud VM and edit the `rclone.conf` file:
```bash
nano ~/.config/rclone/rclone.conf
```
Paste the **entire JSON token** into the `token = ` field under the `[gdrive]` section.

## Alternative: Rclone Config Wizard
Alternatively, you can run `rclone config` on the VM:
1.  Choose `n` for a new remote.
2.  Name it `gdrive`.
3.  Choose `drive` (Google Drive) as the storage type.
4.  Leave `client_id` and `client_secret` blank (unless you have your own).
5.  Choose `1` for full access.
6.  When asked "Use auto config?", choose **`n`** (No).
7.  Rclone will tell you to run `rclone authorize "drive"` on your local machine.
8.  Paste the resulting token into the VM's prompt.
