CLOUDFLARE_ACCOUNT_ID
  Cloudflare account ID, not a zone ID.

R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
  R2 S3 access key and secret (R2 → Manage R2 API Tokens). A normal Cloudflare API token will not work.

R2_BUCKET_NAME
  Bucket name only, no folder path.

R2_PUBLIC_BASE_URL
  Public origin only. No trailing slash, no /desktop.
  Example: https://downloads.example.com or https://pub-….r2.dev

CSC_LINK
  Base64 of the Developer ID Application .p12 (base64 -i cert.p12).

CSC_KEY_PASSWORD
  Password used when exporting that .p12.

APPLE_ID
  Apple ID email for notarization.

APPLE_APP_SPECIFIC_PASSWORD
  App-specific password from appleid.apple.com, not your Apple ID password.

APPLE_TEAM_ID
  10-character Team ID from developer.apple.com/account.
