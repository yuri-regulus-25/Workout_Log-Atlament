# Workout CRUD Validation & Conflict Verification

Related Issue: #140

- Client validationはUX、server validationが最終権威。
- 通常field errorではworking modelを保持し修正再Save可能。
- Resource conflictではauto merge/reload/overwriteしない。closeして最新を開き直す。
- Create race / update revision conflict / delete conflict / date move target conflictを検証。
- fallback/LKG write禁止を検証。
- Windows / Androidで同一write/validation/error semanticsを検証。
